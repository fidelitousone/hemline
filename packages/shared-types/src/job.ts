export const SOURCE_ATS = ['greenhouse', 'ashby', 'otta', 'other'] as const;
export type SourceAts = (typeof SOURCE_ATS)[number];

export const JOB_STATUS = [
  'captured',
  'tailoring',
  'needs_review',
  'ready',
  'applied',
  'interviewing',
  'rejected',
  'accepted',
  'expired',
] as const;
export type JobStatus = (typeof JOB_STATUS)[number];

export const TAILORING_RUN_STATUS = [
  'queued',
  'running',
  'needs_review',
  'approved',
  'failed',
  'cancelled',
] as const;
export type TailoringRunStatus = (typeof TAILORING_RUN_STATUS)[number];

export interface JobData {
  jobTitle: string;
  jobDescription: string;
  sourceAts: SourceAts;
}
