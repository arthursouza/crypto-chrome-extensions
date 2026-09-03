document.addEventListener('DOMContentLoaded', () => {
  const showGmgn = document.getElementById('showGmgn');
  const showBasedBot = document.getElementById('showBasedBot');
  const showOnList = document.getElementById('showOnList');
  const showOnTokenPage = document.getElementById('showOnTokenPage');
  const showFloatingButton = document.getElementById('showFloatingButton');
  const openInNewTab = document.getElementById('openInNewTab');
  const basedBotRefCode = document.getElementById('basedBotRefCode');
  const gmgnRefCode = document.getElementById('gmgnRefCode');
  const saveRefBtn = document.getElementById('saveRefBtn');
  const saveNotice = document.getElementById('saveNotice');

  const defaults = {
    showGmgn: true,
    showBasedBot: true,
    showOnList: true,
    showOnTokenPage: true,
    showFloatingButton: false,
    openInNewTab: true,
    basedBotRefCode: 'lotuzx',
    gmgnRefCode: 'yjpf6bOc'
  };

  // Load saved settings
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(defaults, (items) => {
      showGmgn.checked = items.showGmgn ?? defaults.showGmgn;
      showBasedBot.checked = items.showBasedBot ?? defaults.showBasedBot;
      showOnList.checked = items.showOnList ?? defaults.showOnList;
      showOnTokenPage.checked = items.showOnTokenPage ?? defaults.showOnTokenPage;
      showFloatingButton.checked = items.showFloatingButton ?? defaults.showFloatingButton;
      openInNewTab.checked = items.openInNewTab ?? defaults.openInNewTab;
      basedBotRefCode.value = items.basedBotRefCode !== undefined ? items.basedBotRefCode : defaults.basedBotRefCode;
      gmgnRefCode.value = items.gmgnRefCode !== undefined ? items.gmgnRefCode : (items.customRefCode || defaults.gmgnRefCode);
    });
  }

  // Toggle handlers
  const saveSetting = (key, value) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ [key]: value });
    }
  };

  showGmgn.addEventListener('change', (e) => saveSetting('showGmgn', e.target.checked));
  showBasedBot.addEventListener('change', (e) => saveSetting('showBasedBot', e.target.checked));
  showOnList.addEventListener('change', (e) => saveSetting('showOnList', e.target.checked));
  showOnTokenPage.addEventListener('change', (e) => saveSetting('showOnTokenPage', e.target.checked));
  showFloatingButton.addEventListener('change', (e) => saveSetting('showFloatingButton', e.target.checked));
  openInNewTab.addEventListener('change', (e) => saveSetting('openInNewTab', e.target.checked));

  // Save referral codes
  saveRefBtn.addEventListener('click', () => {
    const bCode = basedBotRefCode.value.trim();
    const gCode = gmgnRefCode.value.trim();
    
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({
        basedBotRefCode: bCode,
        gmgnRefCode: gCode,
        customRefCode: gCode
      }, () => {
        saveNotice.style.display = 'block';
        setTimeout(() => {
          saveNotice.style.display = 'none';
        }, 1800);
      });
    }
  });
});
