import type { JobStatus, SourceAts, TailoringRunStatus } from './job.js';

export interface CaptureJobRequest {
  url: string;
  jobTitle: string;
  jobDescription: string;
  sourceAts: SourceAts;
}

export interface JobDto {
  id: string;
  url: string;
  canonicalUrl: string;
  sourceAts: SourceAts;
  company: string | null;
  title: string | null;
  rawDescription: string | null;
  status: JobStatus;
  relistedFromJobId: string | null;
  isLive: boolean | null;
  lastCheckedAt: string | null;
  capturedAt: string;
  updatedAt: string;
}

export interface CaptureJobResponse {
  job: JobDto;
  isRelisted: boolean;
}

export interface TailoringRevisionDto {
  id: string;
  revisionNumber: number;
  texContent: string;
  compileStatus: 'pending' | 'success' | 'failed';
  compileError: string | null;
  userFeedback: string | null;
  createdBy: 'system' | 'user_feedback';
  createdAt: string;
}

export interface TailoringRunSummaryDto {
  id: string;
  jobId: string;
  status: TailoringRunStatus;
  finalRevisionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TailoringRunDto extends TailoringRunSummaryDto {
  revisions: TailoringRevisionDto[];
}

export interface ReviseTailoringRequest {
  feedback: string;
}

export interface UploadResumeRequest {
  texContent: string;
  filename: string;
}

export interface ResumeVersionDto {
  id: string;
  versionNumber: number;
  isCurrent: boolean;
  createdAt: string;
}

export interface ResumeVersionWithContentDto extends ResumeVersionDto {
  texContent: string;
}
