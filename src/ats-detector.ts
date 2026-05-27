import type { JobData } from './types/job-types';

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
    };
  }

  // Ashby
  const ashbyTitle = text('h1.ashby-job-posting-heading');
  const ashbyDesc = text('[class^="_descriptionText"]');
  if (ashbyTitle && ashbyDesc) {
    return { jobTitle: ashbyTitle, jobDescription: ashbyDesc };
  }

  return null;
}
