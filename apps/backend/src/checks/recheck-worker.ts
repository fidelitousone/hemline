import { eq, notInArray } from 'drizzle-orm';
import type { JobStatus } from '@hemline/shared-types';
import { db } from '../db/client.js';
import { jobChecks, jobs } from '../db/schema.js';
import { env } from '../env.js';
import { boss, RECHECK_QUEUE } from '../pipeline/queue.js';
import { checkJobLiveness, outcomeToIsLive } from './fetchers.js';

const TERMINAL_STATUSES: JobStatus[] = ['rejected', 'accepted', 'expired'];

export async function registerRecheckWorker() {
  await boss.schedule(RECHECK_QUEUE, env.recheckCron, {});

  await boss.work(RECHECK_QUEUE, async () => {
    const activeJobs = await db
      .select()
      .from(jobs)
      .where(notInArray(jobs.status, TERMINAL_STATUSES));

    for (const job of activeJobs) {
      const result = await checkJobLiveness(job.url, job.sourceAts);
      const isLive = outcomeToIsLive(result.outcome);
      const now = new Date();

      await db.insert(jobChecks).values({
        jobId: job.id,
        isLive,
        method: result.method,
        httpStatus: result.httpStatus,
        notes: result.notes,
      });

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
    }
  });
}
