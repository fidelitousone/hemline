const jobTitleDisplay = document.getElementById('jobTitle') as HTMLElement;
const jobDescriptionArea = document.getElementById('jobDescription') as HTMLTextAreaElement;

async function loadJobData(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    jobTitleDisplay.textContent = 'No active tab found';
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'getJobData' });

    if (response?.success) {
      jobTitleDisplay.textContent = response.jobTitle;
      jobDescriptionArea.value = response.jobDescription;
    } else {
      jobTitleDisplay.textContent = 'Failed to extract job data';
    }
  } catch {
    jobTitleDisplay.textContent = 'Not on a supported job page';
  }
}

loadJobData();
