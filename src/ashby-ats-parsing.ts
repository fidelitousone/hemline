import type { JobData } from './types/job-types';

const jobTitleIdentifier: string = 'h1.ashby-job-posting-heading';

const getHTMLElement = (selector: string): HTMLElement => {
  const element = document.querySelector(selector);

  if (!element) {
    throw new Error(`Unable to locate element with selector: ${selector}`);
  }

  if (!(element instanceof HTMLElement)) {
    throw new Error('Element fetched is not an HTML Element!');
  }

  return element;
};

const getJobTitle = (): string => {
  const primaryElement = getHTMLElement(jobTitleIdentifier);
  const jobTitle = primaryElement.innerText.trim();

  if (!jobTitle || jobTitle.length === 0) {
    throw new Error('Failed to get the role title');
  }

  return jobTitle;
};

const jobDescriptionIdentifier: string = '[class^="_descriptionText"]';

const getJobDescription = (): string => {
  const primaryElement = getHTMLElement(jobDescriptionIdentifier);
  const description = primaryElement.innerText;

  if (!description || description.length === 0) {
    throw new Error('Failed to get the job description');
  }

  return description;
};

chrome.runtime.onMessage.addListener(
  (
    message: { type: string },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ) => {
    if (message.type === 'getJobData') {
      try {
        const jobTitle = getJobTitle();
        const jobDescription = getJobDescription();
        const job: JobData = { jobTitle, jobDescription };
        sendResponse({ success: true, ...job });
      } catch (error) {
        sendResponse({ success: false, error: String(error) });
      }
    }
    return true;
  },
);
