import type {
  JobDto,
  ResumeVersionDto,
  ResumeVersionWithContentDto,
  ReviseTailoringRequest,
  TailoringRunDto,
  TailoringRunSummaryDto,
  UploadResumeRequest,
} from '@hemline/shared-types';

const BASE_URL = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Request to ${path} failed (${response.status}): ${body}`);
  }
  return response.json() as Promise<T>;
}

export interface JobWithRuns {
  job: JobDto;
  tailoringRuns: TailoringRunSummaryDto[];
}

export const api = {
  listJobs: (status?: string) =>
    request<JobDto[]>(`/jobs${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  getJob: (id: string) => request<JobWithRuns>(`/jobs/${id}`),

  updateJobStatus: (id: string, status: string) =>
    request<JobDto>(`/jobs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  checkJobNow: (id: string) => request(`/jobs/${id}/check-now`, { method: 'POST' }),

  triggerTailor: (id: string) =>
    request<{ tailoringRunId: string; status: string }>(`/jobs/${id}/tailor`, {
      method: 'POST',
    }),

  getTailoringRun: (runId: string) => request<TailoringRunDto>(`/tailoring-runs/${runId}`),

  reviseTailoringRun: (runId: string, body: ReviseTailoringRequest) =>
    request(`/tailoring-runs/${runId}/revise`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  approveTailoringRun: (runId: string) =>
    request<{ downloadUrl: string }>(`/tailoring-runs/${runId}/approve`, { method: 'POST' }),

  getCurrentResume: () => request<ResumeVersionWithContentDto>('/resume/current'),

  listResumeVersions: () => request<ResumeVersionDto[]>('/resume/versions'),

  uploadResume: (body: UploadResumeRequest) =>
    request<ResumeVersionWithContentDto>('/resume', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  revisionPdfUrl: (runId: string, revisionId: string) =>
    `${BASE_URL}/tailoring-runs/${runId}/revisions/${revisionId}/pdf`,

  downloadUrl: (runId: string) => `${BASE_URL}/tailoring-runs/${runId}/download`,
};
