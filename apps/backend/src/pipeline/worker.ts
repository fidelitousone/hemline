import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { jobs, resumeBaseVersions, tailoringRevisions, tailoringRuns } from '../db/schema.js';
import { compileTex } from './latex-compile.js';
import { callOpenRouter } from './llm.js';
import {
  buildCompileRepairPrompt,
  buildInitialTailorPrompt,
  buildRevisionPrompt,
  extractTexFromResponse,
} from './prompts.js';
import { savePdf } from '../lib/storage.js';
import {
  boss,
  REVISE_QUEUE,
  TAILOR_QUEUE,
  type ReviseJobData,
  type TailorJobData,
} from './queue.js';

const MAX_REPAIR_ATTEMPTS = 2;

async function loadRun(tailoringRunId: string) {
  const [run] = await db
    .select()
    .from(tailoringRuns)
    .where(eq(tailoringRuns.id, tailoringRunId));
  if (!run) throw new Error(`Tailoring run ${tailoringRunId} not found`);

  const [job] = await db.select().from(jobs).where(eq(jobs.id, run.jobId));
  if (!job) throw new Error(`Job ${run.jobId} not found`);

  const [baseResume] = await db
    .select()
    .from(resumeBaseVersions)
    .where(eq(resumeBaseVersions.id, run.baseResumeVersionId));
  if (!baseResume) throw new Error(`Resume version ${run.baseResumeVersionId} not found`);

  return { run, job, baseResume };
}

async function nextRevisionNumber(tailoringRunId: string): Promise<number> {
  const existing = await db
    .select()
    .from(tailoringRevisions)
    .where(eq(tailoringRevisions.tailoringRunId, tailoringRunId));
  return existing.length + 1;
}

async function compileWithRepair(initialTex: string): Promise<{ tex: string; pdf?: Buffer; error?: string }> {
  let tex = initialTex;
  for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
    const result = await compileTex(tex);
    if (result.success && result.pdf) {
      return { tex, pdf: result.pdf };
    }
    if (attempt === MAX_REPAIR_ATTEMPTS) {
      return { tex, error: result.error };
    }
    const repaired = await callOpenRouter(buildCompileRepairPrompt(tex, result.error ?? 'unknown error'));
    tex = extractTexFromResponse(repaired);
  }
  return { tex, error: 'Compilation failed after repair attempts' };
}

async function recordRevision(
  tailoringRunId: string,
  tex: string,
  createdBy: 'system' | 'user_feedback',
  userFeedback: string | null,
  pdf?: Buffer,
  compileError?: string,
) {
  const revisionNumber = await nextRevisionNumber(tailoringRunId);
  const [revision] = await db
    .insert(tailoringRevisions)
    .values({
      tailoringRunId,
      revisionNumber,
      texContent: tex,
      compileStatus: pdf ? 'success' : 'failed',
      compileError: compileError ?? null,
      userFeedback,
      createdBy,
    })
    .returning();

  if (pdf) {
    const pdfPath = await savePdf(revision.id, pdf);
    await db
      .update(tailoringRevisions)
      .set({ compiledPdfPath: pdfPath })
      .where(eq(tailoringRevisions.id, revision.id));
  }

  await db
    .update(tailoringRuns)
    .set({
      status: pdf ? 'needs_review' : 'failed',
      updatedAt: new Date(),
    })
    .where(eq(tailoringRuns.id, tailoringRunId));

  return revision;
}

async function markRunFailed(tailoringRunId: string, err: unknown) {
  console.error(`[worker] tailoring run ${tailoringRunId} failed:`, err);
  await db
    .update(tailoringRuns)
    .set({ status: 'failed', updatedAt: new Date() })
    .where(eq(tailoringRuns.id, tailoringRunId));
}

export async function registerTailoringWorkers() {
  await boss.work<TailorJobData>(TAILOR_QUEUE, async ([job]) => {
    const { tailoringRunId } = job.data;
    try {
      await db
        .update(tailoringRuns)
        .set({ status: 'running', updatedAt: new Date() })
        .where(eq(tailoringRuns.id, tailoringRunId));

      const { job: trackedJob, baseResume } = await loadRun(tailoringRunId);
      const response = await callOpenRouter(
        buildInitialTailorPrompt(
          baseResume.texContent,
          trackedJob.title ?? '',
          trackedJob.rawDescription ?? '',
        ),
      );
      const tex = extractTexFromResponse(response);
      const { tex: finalTex, pdf, error } = await compileWithRepair(tex);
      await recordRevision(tailoringRunId, finalTex, 'system', null, pdf, error);
    } catch (err) {
      await markRunFailed(tailoringRunId, err);
      throw err;
    }
  });

  await boss.work<ReviseJobData>(REVISE_QUEUE, async ([job]) => {
    const { tailoringRunId, feedback } = job.data;
    try {
      await db
        .update(tailoringRuns)
        .set({ status: 'running', updatedAt: new Date() })
        .where(eq(tailoringRuns.id, tailoringRunId));

      const { job: trackedJob } = await loadRun(tailoringRunId);
      const [latestRevision] = await db
        .select()
        .from(tailoringRevisions)
        .where(eq(tailoringRevisions.tailoringRunId, tailoringRunId))
        .orderBy(desc(tailoringRevisions.revisionNumber))
        .limit(1);
      const priorTex = latestRevision?.texContent ?? '';

      const response = await callOpenRouter(
        buildRevisionPrompt(
          priorTex,
          trackedJob.title ?? '',
          trackedJob.rawDescription ?? '',
          feedback,
        ),
      );
      const tex = extractTexFromResponse(response);
      const { tex: finalTex, pdf, error } = await compileWithRepair(tex);
      await recordRevision(tailoringRunId, finalTex, 'user_feedback', feedback, pdf, error);
    } catch (err) {
      await markRunFailed(tailoringRunId, err);
      throw err;
    }
  });
}
