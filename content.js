// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'convertTimestamps') {
    // Convert timestamps using the provided settings
    convertTimestamps(request.settings);
    // Send success response back to popup
    sendResponse({status: 'success'});
    return true; // Keep the message channel open for async response
  }
});

// Function to convert timestamps in the page
function convertTimestamps(settings) {
  
  // Walk through text nodes
  function walkTextNodes(node) {
    if (node.nodeType === 3) {
      // Match timestamps (10 or 13 digits)
      const timestampRegex = /\b(\d{10}|\d{13})\b/g;
      const text = node.textContent;
      let match;
      let newText = text;
      let hasTimestamp = false;
      
      // Check if already formatted time
      const formattedTimeRegex = new RegExp(settings.format.replace(/[YMDHms]/g, '\\d'));
      if (formattedTimeRegex.test(text)) {
        return;
      }
      
      while ((match = timestampRegex.exec(text)) !== null) {
        const timestamp = match[1];
        const date = moment(timestamp.length === 10 ? timestamp * 1000 : Number(timestamp));
        if (date.isValid()) {
          const formattedDate = date.tz(settings.timezone).format(settings.format);
          newText = newText.replace(timestamp, formattedDate);
          hasTimestamp = true;
        }
      }
      
      if (hasTimestamp) {
        node.textContent = newText;
      }
    } else {
      for (let child of node.childNodes) {
        walkTextNodes(child);
      }
    }
  }
  
  walkTextNodes(document.body);
}

// Listen for DOM changes to handle dynamically loaded content
const observer = new MutationObserver(function(mutations) {
  chrome.storage.sync.get({
    timezone: moment.tz.guess(),
    format: 'YYYY-MM-DD HH:mm:ss'
  }, function(settings) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) { // 元素节点
          walkTextNodes(node);
        }
      });
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});