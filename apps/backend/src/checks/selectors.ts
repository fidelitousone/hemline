import type { SourceAts } from '@hemline/shared-types';

// Mirrors the detection selectors in apps/extension/src/ats-detector.ts. Kept as a
// separate copy since this runs against server-fetched/headless-rendered HTML via
// cheerio/Playwright rather than the live extension DOM context.
export const ATS_TITLE_SELECTORS: Record<SourceAts, string | null> = {
  greenhouse: '.job__title h1',
  ashby: 'h1.ashby-job-posting-heading',
  // TODO: replace once real Otta selectors are found (see apps/extension/src/ats-detector.ts).
  otta: '[data-testid="job-title"]',
  other: null,
};

export const REMOVED_PHRASES = [
  'no longer accepting applications',
  'position has been filled',
  'this job is no longer available',
  'job not found',
  'posting has closed',
];
