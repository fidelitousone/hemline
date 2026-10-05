import { and, desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { CaptureJobRequest, JobStatus } from '@hemline/shared-types';
import { db } from '../db/client.js';
import { jobChecks, jobs, resumeBaseVersions, tailoringRuns } from '../db/schema.js';
import { canonicalizeUrl, computeIdentityKey, extractCompanySlug } from '../lib/identity.js';
import { checkJobLiveness, outcomeToIsLive } from '../checks/fetchers.js';
import { boss, TAILOR_QUEUE } from '../pipeline/queue.js';

export default async function jobRoutes(app: FastifyInstance) {
  app.post<{ Body: CaptureJobRequest }>('/api/jobs', async (req, reply) => {
    const { url, jobTitle, jobDescription, sourceAts } = req.body;
    const canonicalUrl = canonicalizeUrl(url);
    const company = extractCompanySlug(url, sourceAts);
    const identityKey = computeIdentityKey(company, jobTitle);

    const [existing] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.canonicalUrl, canonicalUrl));

    if (existing) {
      const [updated] = await db
        .update(jobs)
        .set({ title: jobTitle, rawDescription: jobDescription, updatedAt: new Date() })
        .where(eq(jobs.id, existing.id))
        .returning();
      return reply.send({ job: updated, isRelisted: false });
    }

    const [priorRejected] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.identityKey, identityKey), eq(jobs.status, 'rejected')))
      .orderBy(desc(jobs.capturedAt))
      .limit(1);

    const [created] = await db
      .insert(jobs)
      .values({
        url,
        canonicalUrl,
        sourceAts,
        company,
        title: jobTitle,
        rawDescription: jobDescription,
        identityKey,
        relistedFromJobId: priorRejected?.id ?? null,
      })
      .returning();

    return reply.code(201).send({ job: created, isRelisted: Boolean(priorRejected) });
  });

  app.get<{ Querystring: { status?: JobStatus; q?: string } }>('/api/jobs', async (req) => {
    const { status } = req.query;
    if (status) {
      return db.select().from(jobs).where(eq(jobs.status, status)).orderBy(desc(jobs.capturedAt));
    }
    return db.select().from(jobs).orderBy(desc(jobs.capturedAt));
  });

  app.get<{ Params: { id: string } }>('/api/jobs/:id', async (req, reply) => {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.id));
    if (!job) return reply.code(404).send({ error: 'Job not found' });

    const runs = await db
      .select()
      .from(tailoringRuns)
      .where(eq(tailoringRuns.jobId, job.id))
      .orderBy(desc(tailoringRuns.createdAt));

    return { job, tailoringRuns: runs };
  });

  app.patch<{ Params: { id: string }; Body: { status: JobStatus } }>(
    '/api/jobs/:id',
    async (req, reply) => {
      const [updated] = await db
        .update(jobs)
        .set({ status: req.body.status, updatedAt: new Date() })
        .where(eq(jobs.id, req.params.id))
        .returning();
      if (!updated) return reply.code(404).send({ error: 'Job not found' });
      return updated;
    },
  );

  app.get<{ Params: { id: string } }>('/api/jobs/:id/checks', async (req) => {
    return db
      .select()
      .from(jobChecks)
      .where(eq(jobChecks.jobId, req.params.id))
      .orderBy(desc(jobChecks.checkedAt));
  });

  app.post<{ Params: { id: string } }>('/api/jobs/:id/check-now', async (req, reply) => {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.id));
    if (!job) return reply.code(404).send({ error: 'Job not found' });

    const result = await checkJobLiveness(job.url, job.sourceAts);
    const isLive = outcomeToIsLive(result.outcome);
    const now = new Date();

    const [jobCheck] = await db
      .insert(jobChecks)
      .values({
        jobId: job.id,
        isLive,
        method: result.method,
        httpStatus: result.httpStatus,
        notes: result.notes,
      })
      .returning();

    await db
      .update(jobs)
      .set({
        isLive,
        lastCheckedAt: now,
        lastSeenLiveAt: isLive ? now : job.lastSeenLiveAt,
        status: result.outcome === 'removed' ? 'expired' : job.status,
        updatedAt: now,
      })
      .where(eq(jobs.id, job.id));

    return reply.code(201).send(jobCheck);
  });

  app.post<{ Params: { id: string } }>('/api/jobs/:id/tailor', async (req, reply) => {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.id));
    if (!job) return reply.code(404).send({ error: 'Job not found' });

    const [currentResume] = await db
      .select()
      .from(resumeBaseVersions)
      .where(eq(resumeBaseVersions.isCurrent, true));
    if (!currentResume) {
      return reply.code(400).send({ error: 'No base resume uploaded yet' });
    }

    const [run] = await db
      .insert(tailoringRuns)
      .values({ jobId: job.id, baseResumeVersionId: currentResume.id })
      .returning();

    await db
      .update(jobs)
      .set({ status: 'tailoring', updatedAt: new Date() })
      .where(eq(jobs.id, job.id));

    await boss.send(TAILOR_QUEUE, { tailoringRunId: run.id });

    return reply.code(201).send({ tailoringRunId: run.id, status: 'queued' });
  });
}
