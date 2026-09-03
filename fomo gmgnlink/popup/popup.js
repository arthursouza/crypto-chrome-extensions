document.addEventListener('DOMContentLoaded', () => {
  const showOnList = document.getElementById('showOnList');
  const showOnTokenPage = document.getElementById('showOnTokenPage');
  const showFloatingButton = document.getElementById('showFloatingButton');
  const openInNewTab = document.getElementById('openInNewTab');
  const customRefCode = document.getElementById('customRefCode');
  const saveRefBtn = document.getElementById('saveRefBtn');
  const saveNotice = document.getElementById('saveNotice');

  const defaults = {
    showOnList: true,
    showOnTokenPage: true,
    showFloatingButton: false,
    openInNewTab: true,
    customRefCode: ''
  };

  // Load saved settings
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(defaults, (items) => {
      showOnList.checked = items.showOnList ?? defaults.showOnList;
      showOnTokenPage.checked = items.showOnTokenPage ?? defaults.showOnTokenPage;
      showFloatingButton.checked = items.showFloatingButton ?? defaults.showFloatingButton;
      openInNewTab.checked = items.openInNewTab ?? defaults.openInNewTab;
      customRefCode.value = items.customRefCode || '';
    });
  }

  // Toggle handlers
  const saveToggle = (key, value) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ [key]: value });
    }
  };

  showOnList.addEventListener('change', (e) => saveToggle('showOnList', e.target.checked));
  showOnTokenPage.addEventListener('change', (e) => saveToggle('showOnTokenPage', e.target.checked));
  showFloatingButton.addEventListener('change', (e) => saveToggle('showFloatingButton', e.target.checked));
  openInNewTab.addEventListener('change', (e) => saveToggle('openInNewTab', e.target.checked));

  // Save referral code
  saveRefBtn.addEventListener('click', () => {
    const code = customRefCode.value.trim();
    saveToggle('customRefCode', code);
    saveNotice.style.display = 'block';
    setTimeout(() => {
      saveNotice.style.display = 'none';
    }, 1800);
  });
});
