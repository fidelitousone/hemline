CREATE TYPE "public"."check_method" AS ENUM('fetch', 'headless');--> statement-breakpoint
CREATE TYPE "public"."compile_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('captured', 'tailoring', 'needs_review', 'ready', 'applied', 'interviewing', 'rejected', 'accepted', 'expired');--> statement-breakpoint
CREATE TYPE "public"."revision_created_by" AS ENUM('system', 'user_feedback');--> statement-breakpoint
CREATE TYPE "public"."source_ats" AS ENUM('greenhouse', 'ashby', 'otta', 'other');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('queued', 'running', 'needs_review', 'approved', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "job_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_live" boolean NOT NULL,
	"method" "check_method" NOT NULL,
	"http_status" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"canonical_url" text NOT NULL,
	"source_ats" "source_ats" NOT NULL,
	"company" text,
	"title" text,
	"raw_description" text,
	"identity_key" text NOT NULL,
	"status" "job_status" DEFAULT 'captured' NOT NULL,
	"relisted_from_job_id" uuid,
	"is_live" boolean,
	"last_checked_at" timestamp with time zone,
	"last_seen_live_at" timestamp with time zone,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_base_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_number" integer NOT NULL,
	"tex_content" text NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tailoring_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tailoring_run_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"tex_content" text NOT NULL,
	"compiled_pdf_path" text,
	"compile_status" "compile_status" DEFAULT 'pending' NOT NULL,
	"compile_error" text,
	"user_feedback" text,
	"created_by" "revision_created_by" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tailoring_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"base_resume_version_id" uuid NOT NULL,
	"status" "run_status" DEFAULT 'queued' NOT NULL,
	"final_revision_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_checks" ADD CONSTRAINT "job_checks_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tailoring_revisions" ADD CONSTRAINT "tailoring_revisions_tailoring_run_id_tailoring_runs_id_fk" FOREIGN KEY ("tailoring_run_id") REFERENCES "public"."tailoring_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tailoring_runs" ADD CONSTRAINT "tailoring_runs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tailoring_runs" ADD CONSTRAINT "tailoring_runs_base_resume_version_id_resume_base_versions_id_fk" FOREIGN KEY ("base_resume_version_id") REFERENCES "public"."resume_base_versions"("id") ON DELETE no action ON UPDATE no action;