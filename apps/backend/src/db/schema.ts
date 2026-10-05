import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { JOB_STATUS, SOURCE_ATS, TAILORING_RUN_STATUS } from '@hemline/shared-types';

export const sourceAtsEnum = pgEnum('source_ats', SOURCE_ATS);
export const jobStatusEnum = pgEnum('job_status', JOB_STATUS);
export const tailoringRunStatusEnum = pgEnum(
  'run_status',
  TAILORING_RUN_STATUS,
);
export const compileStatusEnum = pgEnum('compile_status', [
  'pending',
  'success',
  'failed',
]);
export const revisionCreatedByEnum = pgEnum('revision_created_by', [
  'system',
  'user_feedback',
]);
export const checkMethodEnum = pgEnum('check_method', ['fetch', 'headless']);

export const resumeBaseVersions = pgTable('resume_base_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  versionNumber: integer('version_number').notNull(),
  texContent: text('tex_content').notNull(),
  isCurrent: boolean('is_current').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: text('url').notNull(),
  canonicalUrl: text('canonical_url').notNull(),
  sourceAts: sourceAtsEnum('source_ats').notNull(),
  company: text('company'),
  title: text('title'),
  rawDescription: text('raw_description'),
  identityKey: text('identity_key').notNull(),
  status: jobStatusEnum('status').notNull().default('captured'),
  relistedFromJobId: uuid('relisted_from_job_id'),
  isLive: boolean('is_live'),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  lastSeenLiveAt: timestamp('last_seen_live_at', { withTimezone: true }),
  capturedAt: timestamp('captured_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const jobChecks = pgTable('job_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id),
  checkedAt: timestamp('checked_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  isLive: boolean('is_live'),
  method: checkMethodEnum('method').notNull(),
  httpStatus: integer('http_status'),
  notes: text('notes'),
});

export const tailoringRuns = pgTable('tailoring_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id),
  baseResumeVersionId: uuid('base_resume_version_id')
    .notNull()
    .references(() => resumeBaseVersions.id),
  status: tailoringRunStatusEnum('status').notNull().default('queued'),
  finalRevisionId: uuid('final_revision_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const tailoringRevisions = pgTable('tailoring_revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tailoringRunId: uuid('tailoring_run_id')
    .notNull()
    .references(() => tailoringRuns.id),
  revisionNumber: integer('revision_number').notNull(),
  texContent: text('tex_content').notNull(),
  compiledPdfPath: text('compiled_pdf_path'),
  compileStatus: compileStatusEnum('compile_status').notNull().default('pending'),
  compileError: text('compile_error'),
  userFeedback: text('user_feedback'),
  createdBy: revisionCreatedByEnum('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
