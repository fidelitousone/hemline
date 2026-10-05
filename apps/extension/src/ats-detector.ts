import type { JobData, SourceAts } from '@hemline/shared-types';

// Exported for other consumers that run as normal bundled modules (e.g. the highlighter
// content script). detectJobData() below must keep its own selector string literals
// inline rather than referencing these — it is serialized via Function.prototype.toString()
// and injected into the page via chrome.scripting.executeScript, so it cannot close over
// module-level constants at runtime.
export const JOB_DESCRIPTION_SELECTORS: Record<
  Exclude<SourceAts, 'other'>,
  string
> = {
  greenhouse: '.job__description.body',
  ashby: '[class^="_descriptionText"]',
  // TODO: placeholder — inspect a live Otta/Welcome to the Jungle job posting in devtools
  // and replace with the real selector before relying on this.
  otta: '[data-testid="job-description"]',
};

// Must remain self-contained this function is serialized and injected into page context
// via chrome.scripting.executeScript. No imports or closure variables will survive.
export function detectJobData(): JobData | null {
  const text = (selector: string): string | null => {
    const el = document.querySelector<HTMLElement>(selector);
    return el ? el.innerText.trim() : null;
  };

  // Greenhouse
  const ghTitle = text('.job__title h1');
  const ghDesc = text('.job__description.body');
  if (ghTitle && ghDesc) {
    return {
      jobTitle: ghTitle.split('\n')[0] ?? ghTitle,
      jobDescription: ghDesc,
      sourceAts: 'greenhouse',
    };
  }

  // Ashby
  const ashbyTitle = text('h1.ashby-job-posting-heading');
  const ashbyDesc = text('[class^="_descriptionText"]');
  if (ashbyTitle && ashbyDesc) {
    return {
      jobTitle: ashbyTitle,
      jobDescription: ashbyDesc,
      sourceAts: 'ashby',
    };
  }

  // Otta / Welcome to the Jungle
  // TODO: placeholder selectors — inspect a live posting and replace before relying on this.
  const ottaTitle = text('[data-testid="job-title"]');
  const ottaDesc = text('[data-testid="job-description"]');
  if (ottaTitle && ottaDesc) {
    return {
      jobTitle: ottaTitle,
      jobDescription: ottaDesc,
      sourceAts: 'otta',
    };
  }

  return null;
}
