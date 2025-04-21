document.addEventListener('DOMContentLoaded', function() {
  // Initialize timezone selector
  const timezoneSelect = document.getElementById('timezone');
  const timezones = moment.tz.names();
  const userTimezone = moment.tz.guess();

  // Set text content
  document.getElementById('timezone-label').textContent = 'Timezone';
  document.getElementById('format-label').textContent = 'Time Format';
  document.getElementById('convert').textContent = 'Convert';
  document.getElementById('readme-link').textContent = 'README';
  document.getElementById('donate-link').textContent = 'Donate';
  
  timezones.forEach(zone => {
    const option = document.createElement('option');
    option.value = zone;
    option.text = zone;
    if (zone === userTimezone) {
      option.selected = true;
    }
    timezoneSelect.appendChild(option);
  });

  // Initialize time format
  const formatInput = document.getElementById('format');
  
  // Load settings from storage
  chrome.storage.sync.get({
    timezone: userTimezone,

    format: 'YYYY-MM-DD HH:mm:ss'
  }, function(items) {
    timezoneSelect.value = items.timezone;

    formatInput.value = items.format;
  });

  // Save settings
  function saveSettings() {
    const settings = {
      timezone: timezoneSelect.value,
  
      format: formatInput.value
    };
    chrome.storage.sync.set(settings);
    

  }

  // Listen for settings changes
  timezoneSelect.addEventListener('change', saveSettings);

  formatInput.addEventListener('change', saveSettings);

  // Convert button click event
  document.getElementById('convert').addEventListener('click', function() {
    // Get current settings
    const settings = {
      timezone: timezoneSelect.value,
  
      format: formatInput.value
    };
    
    // Save settings before converting
    chrome.storage.sync.set(settings, function() {
      // Send message to current tab
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'convertTimestamps',
            settings: settings
          }, function(response) {
            if (chrome.runtime.lastError) {
              console.error('Error:', chrome.runtime.lastError.message);
            } else if (response && response.status === 'success') {
              console.log('Timestamps converted successfully');
            }
          });
        } else {
          console.error('No active tab found');
        }
      });
    });
  });
});

// Function to convert timestamps in the page
function convertTimestamps(settings) {
  moment.locale(settings.language);
  
  // Walk through text nodes
  function walkTextNodes(node) {
    if (node.nodeType === 3) {
      // Match timestamps (10 or 13 digits)
      const timestampRegex = /\b(\d{10}|\d{13})\b/g;
      const text = node.textContent;
      let match;
      let newText = text;
      
      while ((match = timestampRegex.exec(text)) !== null) {
        const timestamp = match[1];
        const date = moment(timestamp.length === 10 ? timestamp * 1000 : Number(timestamp));
        if (date.isValid()) {
          const formattedDate = date.tz(settings.timezone).format(settings.format);
          newText = newText.replace(timestamp, formattedDate);
        }
      }
      
      if (newText !== text) {
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