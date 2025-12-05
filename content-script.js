var jobTitle = document.getElementsByClassName('job__title');
if (jobTitle.length != 0) {
    var primaryElement = jobTitle[0];
    if (primaryElement instanceof HTMLElement) {
        var title = primaryElement.innerText;
        var jobTitle_1 = title.split('\n');
        console.log(jobTitle_1[0]);
    }
}
