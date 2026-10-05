import { createReadStream } from 'node:fs';
import { desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { ReviseTailoringRequest } from '@hemline/shared-types';
import { db } from '../db/client.js';
import { jobs, tailoringRevisions, tailoringRuns } from '../db/schema.js';
import { candidateFilename } from '../lib/storage.js';
import { boss, REVISE_QUEUE } from '../pipeline/queue.js';

export default async function tailoringRoutes(app: FastifyInstance) {
  app.get<{ Params: { runId: string } }>('/api/tailoring-runs/:runId', async (req, reply) => {
    const [run] = await db
      .select()
      .from(tailoringRuns)
      .where(eq(tailoringRuns.id, req.params.runId));
    if (!run) return reply.code(404).send({ error: 'Tailoring run not found' });

    const revisions = await db
      .select()
      .from(tailoringRevisions)
      .where(eq(tailoringRevisions.tailoringRunId, run.id))
      .orderBy(tailoringRevisions.revisionNumber);

    return { ...run, revisions };
  });

  app.post<{ Params: { runId: string }; Body: ReviseTailoringRequest }>(
    '/api/tailoring-runs/:runId/revise',
    async (req, reply) => {
      const [run] = await db
        .select()
        .from(tailoringRuns)
        .where(eq(tailoringRuns.id, req.params.runId));
      if (!run) return reply.code(404).send({ error: 'Tailoring run not found' });

      await boss.send(REVISE_QUEUE, {
        tailoringRunId: run.id,
        feedback: req.body.feedback,
      });

      return reply.code(202).send({ status: 'queued' });
    },
  );

  app.post<{ Params: { runId: string } }>(
    '/api/tailoring-runs/:runId/approve',
    async (req, reply) => {
      const [latestSuccess] = await db
        .select()
        .from(tailoringRevisions)
        .where(eq(tailoringRevisions.tailoringRunId, req.params.runId))
        .orderBy(desc(tailoringRevisions.revisionNumber));
      if (!latestSuccess || latestSuccess.compileStatus !== 'success') {
        return reply.code(400).send({ error: 'No successfully compiled revision to approve' });
      }

      const [run] = await db
        .update(tailoringRuns)
        .set({ status: 'approved', finalRevisionId: latestSuccess.id, updatedAt: new Date() })
        .where(eq(tailoringRuns.id, req.params.runId))
        .returning();
      if (!run) return reply.code(404).send({ error: 'Tailoring run not found' });

      await db
        .update(jobs)
        .set({ status: 'ready', updatedAt: new Date() })
        .where(eq(jobs.id, run.jobId));

      return { downloadUrl: `/api/tailoring-runs/${run.id}/download` };
    },
  );

  app.get<{ Params: { runId: string; revisionId: string } }>(
    '/api/tailoring-runs/:runId/revisions/:revisionId/pdf',
    async (req, reply) => {
      const [revision] = await db
        .select()
        .from(tailoringRevisions)
        .where(eq(tailoringRevisions.id, req.params.revisionId));
      if (!revision?.compiledPdfPath) {
        return reply.code(404).send({ error: 'PDF not available for this revision' });
      }
      reply.type('application/pdf');
      return reply.send(createReadStream(revision.compiledPdfPath));
    },
  );

  app.get<{ Params: { runId: string } }>(
    '/api/tailoring-runs/:runId/download',
    async (req, reply) => {
      const [run] = await db
        .select()
        .from(tailoringRuns)
        .where(eq(tailoringRuns.id, req.params.runId));
      if (!run?.finalRevisionId) {
        return reply.code(404).send({ error: 'No approved revision for this run' });
      }

      const [revision] = await db
        .select()
        .from(tailoringRevisions)
        .where(eq(tailoringRevisions.id, run.finalRevisionId));
      if (!revision?.compiledPdfPath) {
        return reply.code(404).send({ error: 'PDF not available' });
      }

      reply.header('Content-Disposition', `attachment; filename="${candidateFilename()}"`);
      reply.type('application/pdf');
      return reply.send(createReadStream(revision.compiledPdfPath));
    },
  );
}
