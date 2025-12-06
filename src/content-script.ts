const jobTitleIdentifier: string = 'job__title';
const jobDescriptionIdentifier: string = 'job__description body';

const getHTMLElement = (
  elementList: HTMLCollectionOf<Element>,
): HTMLElement => {
  if (elementList.length === 0) {
    throw new Error('Unable to locate the job title for this role');
  }

  let primaryElement = elementList[0];
  if (!(primaryElement instanceof HTMLElement)) {
    throw new Error('Element fetched from job title is not an HTML Element!');
  }
  return primaryElement;
};

const getJobTitle = (): string => {
  const jobTitleElementList =
    document.getElementsByClassName(jobTitleIdentifier);

  const primaryElement = getHTMLElement(jobTitleElementList);
  let title = primaryElement.innerText;
  let [jobTitle, _] = title.split('\n');
  if (jobTitle?.length !== 0) {
    return jobTitle;
  }
};

const getJobDescription = (): string => {
  const jobDescriptionElementList = document.getElementsByClassName(
    jobDescriptionIdentifier,
  );

  const primaryElement = getHTMLElement(jobDescriptionElementList);
  let description = primaryElement.innerText;
  return description;
};
