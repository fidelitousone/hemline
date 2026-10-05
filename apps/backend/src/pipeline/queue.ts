import { PgBoss } from 'pg-boss';
import { env } from '../env.js';

export const TAILOR_QUEUE = 'tailor-job';
export const REVISE_QUEUE = 'revise-job';
export const RECHECK_QUEUE = 'recheck-job';

export interface TailorJobData {
  tailoringRunId: string;
}

export interface ReviseJobData {
  tailoringRunId: string;
  feedback: string;
}

export const boss = new PgBoss(env.databaseUrl);

export async function startQueue(): Promise<PgBoss> {
  boss.on('error', (err) => console.error('[pg-boss]', err));
  await boss.start();
  await boss.createQueue(TAILOR_QUEUE);
  await boss.createQueue(REVISE_QUEUE);
  await boss.createQueue(RECHECK_QUEUE);
  return boss;
}
