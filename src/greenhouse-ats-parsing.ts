const jobTitleIdentifier: string = '.job__title h1';
const jobDescriptionIdentifier: string = '.job__description.body';

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
  const title = primaryElement.innerText;
  let jobTitle = title.split('\n')[0] ?? '';

  if (!jobTitle || jobTitle.length === 0) {
    throw new Error('Failed to get the role title');
  }

  return jobTitle;
};

const getJobDescription = (): string => {
  const primaryElement = getHTMLElement(jobDescriptionIdentifier);
  const description = primaryElement.innerText;
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
        sendResponse({ success: true, jobTitle, jobDescription });
      } catch (error) {
        sendResponse({ success: false, error: String(error) });
      }
    }
    return true;
  },
);
