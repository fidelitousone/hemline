const jobTitle = document.getElementsByClassName('job__title');

if (jobTitle.length != 0) {
  let primaryElement = jobTitle[0];
  if (primaryElement instanceof HTMLElement) {
    let title = primaryElement.innerText;
    let jobTitle = title.split('\n');
    console.log(jobTitle[0]);
  }
}
