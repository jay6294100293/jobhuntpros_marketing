// LaunchBusiness AI — Tutorial Studio background service worker
// Handles tab capture stream ID requests from the popup.
// Runs as a Manifest V3 service worker — no DOM access.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "get_stream_id") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) {
        sendResponse({ error: "No active tab found." });
        return;
      }
      // tabCapture.getMediaStreamId gives popup a stream ID it can use with getUserMedia
      chrome.tabCapture.getMediaStreamId(
        { targetTabId: tab.id },
        (streamId) => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ streamId, tabId: tab.id, tabTitle: tab.title || "" });
          }
        }
      );
    });
    return true; // keep channel open for async sendResponse
  }
});
