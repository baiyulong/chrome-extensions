chrome.action.onClicked.addListener((tab) => {
  chrome.system.display.getInfo((displays) => {
    const primaryDisplay = displays.find(display => display.isPrimary) || displays[0];
    const width = Math.floor(primaryDisplay.workArea.width * 0.9);
    const height = Math.floor(primaryDisplay.workArea.height * 0.9);
    const left = Math.floor((primaryDisplay.workArea.width - width) / 2);
    const top = Math.floor((primaryDisplay.workArea.height - height) / 2);

    chrome.windows.create({
      url: 'popup.html',
      type: 'popup',
      width: width,
      height: height,
      left: left + primaryDisplay.workArea.left,
      top: top + primaryDisplay.workArea.top
    });
  });
});