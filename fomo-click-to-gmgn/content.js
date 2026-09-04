/**
 * FOMO to GMGN & BasedBot Chrome Extension - Content Script
 * Injects GMGN and BasedBot navigation and trading buttons into fomo.family
 */

(function () {
  'use strict';

  // Prevent multiple executions in the same frame
  if (window.__FOMO_TRADING_EXT_INJECTED__) return;
  window.__FOMO_TRADING_EXT_INJECTED__ = true;

  // Creator referral codes
  const GMGN_REF_CODE = 'yjpf6bOc';
  const BASEDBOT_REF_CODE = 'lotuzx';

  // Default configuration
  let config = {
    showGmgn: true,
    showBasedBot: true,
    showOnList: true,
    showOnTokenPage: true,
    showFloatingButton: false, // Default false to avoid visual clutter
    openInNewTab: true
  };

  // Load user configuration from Chrome storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(config, (items) => {
      if (items) {
        config = { ...config, ...items };
      }
      runScan();
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync') {
        for (let key in changes) {
          config[key] = changes[key].newValue;
        }
        cleanupAndRescan();
      }
    });
  }

  // Icons
  const GMGN_ICON_SVG = `
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM8.5 8C9.33 8 10 8.67 10 9.5C10 10.33 9.33 11 8.5 11C7.67 11 7 10.33 7 9.5C7 8.67 7.67 8 8.5 8ZM15.5 8C16.33 8 17 8.67 17 9.5C17 10.33 16.33 11 15.5 11C14.67 11 14 10.33 14 9.5C14 8.67 14.67 8 15.5 8ZM12 17.5C9.67 17.5 7.69 16.04 6.89 14H17.11C16.31 16.04 14.33 17.5 12 17.5Z" fill="currentColor"/>
    </svg>
  `;

  const BASEDBOT_ICON_SVG = `
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
      <path d="M12 2V5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="12" cy="2" r="1.2" fill="currentColor"/>
      <rect x="3" y="5" width="18" height="14" rx="4" stroke="currentColor" stroke-width="2" fill="none"/>
      <circle cx="8.5" cy="11.5" r="1.6" fill="currentColor"/>
      <circle cx="15.5" cy="11.5" r="1.6" fill="currentColor"/>
      <path d="M9 15.2C10 16.2 14 16.2 15 15.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `;

  const EXTERNAL_LINK_SVG = `
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
  `;

  // GMGN chain normalization mapping
  const GMGN_CHAIN_MAP = {
    solana: 'sol',
    sol: 'sol',
    base: 'base',
    ethereum: 'eth',
    eth: 'eth',
    mainnet: 'eth',
    bnb: 'bsc',
    bsc: 'bsc',
    binance: 'bsc',
    robinhood: 'robinhood',
    rh: 'robinhood',
    monad: 'monad',
    tron: 'tron',
    trx: 'tron',
    arbitrum: 'arb',
    arb: 'arb',
    blast: 'blast',
    avalanche: 'avax',
    avax: 'avax',
    polygon: 'polygon',
    matic: 'polygon',
    sui: 'sui',
    hyperliquid: 'hyperliquid',
    berachain: 'berachain',
    bera: 'berachain',
    abstract: 'abstract',
    sei: 'sei',
    aptos: 'aptos',
    ton: 'ton'
  };

  // BasedBot chain normalization mapping
  const BASEDBOT_CHAIN_MAP = {
    robinhood: 'robinhood',
    rh: 'robinhood',
    solana: 'solana',
    sol: 'solana',
    base: 'base',
    ethereum: 'ethereum',
    eth: 'ethereum',
    mainnet: 'ethereum',
    bnb: 'bsc',
    bsc: 'bsc',
    binance: 'bsc',
    arbitrum: 'arbitrum',
    arb: 'arbitrum',
    blast: 'blast',
    avalanche: 'avalanche',
    avax: 'avalanche',
    polygon: 'polygon',
    matic: 'polygon',
    monad: 'monad',
    tron: 'tron',
    trx: 'tron',
    sui: 'sui',
    berachain: 'berachain',
    bera: 'berachain',
    abstract: 'abstract',
    sei: 'sei',
    aptos: 'aptos',
    ton: 'ton',
    hyperliquid: 'hyperliquid'
  };

  /**
   * Checks if address matches Solana base58 pattern
   */
  function isSolanaAddress(addr) {
    if (!addr || typeof addr !== 'string') return false;
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr.trim());
  }

  /**
   * Checks if string looks like a valid crypto contract address
   */
  function isValidTokenAddress(addr) {
    if (!addr || typeof addr !== 'string') return false;
    const clean = addr.trim();
    if (clean.length < 20) return false;
    if (clean.startsWith('0x') && clean.length === 42) return true;
    if (isSolanaAddress(clean)) return true;
    return clean.length >= 30 && clean.length <= 50;
  }

  /**
   * Normalizes chain identifier for GMGN
   */
  function normalizeGmgnChain(chainStr, tokenAddress = '') {
    if (chainStr) {
      const clean = String(chainStr).toLowerCase().trim();
      if (GMGN_CHAIN_MAP[clean]) {
        return GMGN_CHAIN_MAP[clean];
      }
      if (clean && clean !== 'token' && clean !== 'tokens') {
        return clean;
      }
    }

    if (tokenAddress) {
      if (isSolanaAddress(tokenAddress)) return 'sol';
      if (tokenAddress.startsWith('0x')) return 'base';
    }

    return 'sol';
  }

  /**
   * Normalizes chain identifier for BasedBot
   */
  function normalizeBasedBotChain(chainStr, tokenAddress = '') {
    if (chainStr) {
      const clean = String(chainStr).toLowerCase().trim();
      if (BASEDBOT_CHAIN_MAP[clean]) {
        return BASEDBOT_CHAIN_MAP[clean];
      }
      if (clean && clean !== 'token' && clean !== 'tokens') {
        return clean;
      }
    }

    if (tokenAddress) {
      if (isSolanaAddress(tokenAddress)) return 'solana';
      if (tokenAddress.startsWith('0x')) return 'robinhood';
    }

    return 'solana';
  }

  /**
   * Generates GMGN URL for token and chain using {ref}_{tokenAddress} format
   */
  function buildGmgnUrl(chain, address) {
    const normalizedChain = normalizeGmgnChain(chain, address);
    if (GMGN_REF_CODE) {
      return `https://gmgn.ai/${normalizedChain}/token/${encodeURIComponent(GMGN_REF_CODE)}_${address}`;
    }
    return `https://gmgn.ai/${normalizedChain}/token/${address}`;
  }

  /**
   * Generates BasedBot URL with referral (/r/lotuzx/...)
   */
  function buildBasedBotUrl(chain, address) {
    const normalizedChain = normalizeBasedBotChain(chain, address);
    if (BASEDBOT_REF_CODE) {
      return `https://basedbot.app/r/${encodeURIComponent(BASEDBOT_REF_CODE)}/token/${normalizedChain}/${address}`;
    }
    return `https://basedbot.app/token/${normalizedChain}/${address}`;
  }

  /**
   * Handles opening a URL safely
   */
  function handleOpenUrl(e, url) {
    e.stopPropagation();
    e.preventDefault();
    if (config.openInNewTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  }

  /**
   * Creates GMGN button element
   */
  function createGmgnButton(chain, address, variant = 'list') {
    const gmgnUrl = buildGmgnUrl(chain, address);
    const normalizedChain = normalizeGmgnChain(chain, address);

    const btn = document.createElement('a');
    btn.href = gmgnUrl;
    btn.target = config.openInNewTab ? '_blank' : '_self';
    btn.rel = 'noopener noreferrer';
    btn.className = `fomo-ext-btn fomo-ext-btn-gmgn fomo-ext-${variant}-btn`;
    btn.setAttribute('data-platform', 'gmgn');
    btn.setAttribute('data-token-address', address);
    btn.setAttribute('data-token-chain', normalizedChain);
    btn.title = `Trade on GMGN (${normalizedChain.toUpperCase()})`;

    let innerContent = '';
    if (variant === 'list') {
      innerContent = `
        ${GMGN_ICON_SVG}
        <span class="fomo-ext-label">GMGN</span>
      `;
    } else if (variant === 'header') {
      innerContent = `
        ${GMGN_ICON_SVG}
        <span class="fomo-ext-label">Trade GMGN</span>
        <span class="fomo-ext-chain-badge fomo-ext-badge-gmgn">${normalizedChain}</span>
        ${EXTERNAL_LINK_SVG}
      `;
    } else if (variant === 'floating') {
      innerContent = `
        <span class="fomo-ext-icon">${GMGN_ICON_SVG}</span>
        <span>GMGN</span>
        <span class="fomo-ext-chain-badge fomo-ext-badge-gmgn">${normalizedChain}</span>
      `;
    }

    btn.innerHTML = innerContent;
    btn.addEventListener('click', (e) => handleOpenUrl(e, gmgnUrl));
    return btn;
  }

  /**
   * Creates BasedBot button element
   */
  function createBasedBotButton(chain, address, variant = 'list') {
    const basedBotUrl = buildBasedBotUrl(chain, address);
    const normalizedChain = normalizeBasedBotChain(chain, address);

    const btn = document.createElement('a');
    btn.href = basedBotUrl;
    btn.target = config.openInNewTab ? '_blank' : '_self';
    btn.rel = 'noopener noreferrer';
    btn.className = `fomo-ext-btn fomo-ext-btn-basedbot fomo-ext-${variant}-btn`;
    btn.setAttribute('data-platform', 'basedbot');
    btn.setAttribute('data-token-address', address);
    btn.setAttribute('data-token-chain', normalizedChain);
    btn.title = `Trade on BasedBot (${normalizedChain.toUpperCase()})`;

    let innerContent = '';
    if (variant === 'list') {
      innerContent = `
        ${BASEDBOT_ICON_SVG}
        <span class="fomo-ext-label">BasedBot</span>
      `;
    } else if (variant === 'header') {
      innerContent = `
        ${BASEDBOT_ICON_SVG}
        <span class="fomo-ext-label">Trade BasedBot</span>
        <span class="fomo-ext-chain-badge fomo-ext-badge-basedbot">${normalizedChain}</span>
        ${EXTERNAL_LINK_SVG}
      `;
    } else if (variant === 'floating') {
      innerContent = `
        <span class="fomo-ext-icon">${BASEDBOT_ICON_SVG}</span>
        <span>BasedBot</span>
        <span class="fomo-ext-chain-badge fomo-ext-badge-basedbot">${normalizedChain}</span>
      `;
    }

    btn.innerHTML = innerContent;
    btn.addEventListener('click', (e) => handleOpenUrl(e, basedBotUrl));
    return btn;
  }

  /**
   * Creates a button group container with enabled platforms
   */
  function createButtonGroup(chain, address, variant = 'list') {
    const group = document.createElement('div');
    group.className = `fomo-ext-btn-group fomo-ext-${variant}-group`;
    group.setAttribute('data-fomo-ext-group', 'true');
    group.setAttribute('data-token-address', address);
    group.setAttribute('data-token-chain', chain);

    if (config.showGmgn) {
      group.appendChild(createGmgnButton(chain, address, variant));
    }
    if (config.showBasedBot) {
      group.appendChild(createBasedBotButton(chain, address, variant));
    }

    return group;
  }

  /**
   * Extracts current token info from URL if on token detail page
   */
  function getTokenPageInfo() {
    const pathname = window.location.pathname;
    // Format: /tokens/:chain/:tokenAddress or /token/:chain/:tokenAddress
    const match = pathname.match(/^\/tokens?\/([^\/]+)\/([^\/\?#]+)/i);
    if (match) {
      const chain = match[1];
      const address = match[2];
      if (isValidTokenAddress(address)) {
        return { chain, address };
      }
    }
    return null;
  }

  /**
   * Injects buttons on Token Detail Page
   */
  function injectTokenPage() {
    const tokenInfo = getTokenPageInfo();
    if (!tokenInfo) {
      removeTokenPageElements();
      return;
    }

    const { chain, address } = tokenInfo;

    // 1. Handle Floating Action Buttons (Optional)
    if (config.showFloatingButton && (config.showGmgn || config.showBasedBot)) {
      let floatingContainer = document.getElementById('fomo-ext-floating-container');
      if (!floatingContainer) {
        floatingContainer = document.createElement('div');
        floatingContainer.id = 'fomo-ext-floating-container';
        floatingContainer.className = 'fomo-ext-floating-container';
        floatingContainer.setAttribute('data-token-address', address);

        if (config.showGmgn) {
          const gmgnFloating = createGmgnButton(chain, address, 'floating');
          floatingContainer.appendChild(gmgnFloating);
        }
        if (config.showBasedBot) {
          const basedBotFloating = createBasedBotButton(chain, address, 'floating');
          floatingContainer.appendChild(basedBotFloating);
        }
        document.body.appendChild(floatingContainer);
      } else {
        if (floatingContainer.getAttribute('data-token-address') !== address) {
          floatingContainer.remove();
          injectTokenPage();
          return;
        }
      }
    } else {
      const existingFloating = document.getElementById('fomo-ext-floating-container');
      if (existingFloating) existingFloating.remove();
    }

    // 2. Handle Header Action Button
    if (!config.showOnTokenPage || (!config.showGmgn && !config.showBasedBot)) {
      const existingHeader = document.getElementById('fomo-ext-header-action');
      if (existingHeader) existingHeader.remove();
      return;
    }

    const existingHeaderGroup = document.getElementById('fomo-ext-header-action');
    if (existingHeaderGroup) {
      if (existingHeaderGroup.getAttribute('data-token-address') === address) {
        return; // Current buttons are active and up to date
      } else {
        existingHeaderGroup.remove();
      }
    }

    // Clean up any stray duplicate header buttons
    document.querySelectorAll('.fomo-ext-header-group').forEach(el => el.remove());

    // Locate target container in FOMO token header
    const socialLinks = Array.from(document.querySelectorAll('a[href*="twitter.com"], a[href*="x.com"], a[href*="t.me"], a[href*="solscan.io"], a[href*="etherscan.io"], a[href*="basescan.org"], a[href*="bscscan.com"]'));

    let targetContainer = null;
    if (socialLinks.length > 0) {
      targetContainer = socialLinks[0].parentElement;
    }

    // Fallback containers
    if (!targetContainer) {
      const copyBtns = Array.from(document.querySelectorAll('button, div')).filter(el => {
        const txt = el.textContent || '';
        return txt.includes('0x') || isSolanaAddress(txt.trim()) || el.getAttribute('aria-label')?.toLowerCase().includes('copy');
      });
      if (copyBtns.length > 0) {
        targetContainer = copyBtns[0].parentElement;
      }
    }

    if (!targetContainer) {
      const headings = Array.from(document.querySelectorAll('h1, h2, [class*="TokenSummary"]'));
      if (headings.length > 0) {
        targetContainer = headings[0].parentElement;
      }
    }

    if (targetContainer) {
      const headerGroup = createButtonGroup(chain, address, 'header');
      headerGroup.id = 'fomo-ext-header-action';
      targetContainer.appendChild(headerGroup);
    }
  }

  /**
   * Scans and injects compact buttons into Token List rows and cards
   */
  function injectTokenList() {
    if (!config.showOnList || (!config.showGmgn && !config.showBasedBot)) {
      removeListButtons();
      return;
    }

    const tokenPageInfo = getTokenPageInfo();
    const currentPageAddress = tokenPageInfo ? tokenPageInfo.address.toLowerCase() : null;

    // Find all links referencing tokens: /tokens/:chain/:address or /token/:chain/:address
    const tokenLinks = Array.from(document.querySelectorAll('a[href*="/tokens/"], a[href*="/token/"]'));

    tokenLinks.forEach((link) => {
      // Skip if link is an injected button or inside one
      if (link.classList.contains('fomo-ext-btn') || link.closest('.fomo-ext-btn-group')) {
        return;
      }

      const href = link.getAttribute('href') || '';
      const match = href.match(/\/tokens?\/([^\/]+)\/([^\/\?#]+)/i);
      if (!match) return;

      const chain = match[1];
      const address = match[2];

      if (!isValidTokenAddress(address)) return;

      // On token detail page, do NOT inject list buttons for the main token itself in breadcrumbs/header
      if (currentPageAddress && address.toLowerCase() === currentPageAddress) {
        return;
      }

      // If the link is just an image / avatar wrapper with no text, skip
      if (link.querySelector('img') && !link.textContent.trim()) {
        return;
      }

      // Find row/card container
      const rowContainer = link.closest('tr, [role="row"], [data-row], li') || 
                           link.closest('[class*="tokenRow"], [class*="TokenRow"], [class*="Card"], [class*="card"]') ||
                           link.parentElement;

      if (!rowContainer) return;

      // Prevent duplicate injection in the same row
      if (rowContainer.querySelector(`.fomo-ext-btn-group[data-token-address="${address}"]`)) {
        return;
      }

      // Check row marker
      if (rowContainer.hasAttribute('data-fomo-ext-row') && rowContainer.getAttribute('data-fomo-ext-row') === address) {
        return;
      }

      const btnGroup = createButtonGroup(chain, address, 'list');
      rowContainer.setAttribute('data-fomo-ext-row', address);

      // Look for the text/info column container (e.g. <div class="flex min-w-0 flex-1 flex-col gap-1.5">)
      const colContainer = link.querySelector('[class*="flex-col"], [class*="flex flex-col"]') ||
                           link.parentElement?.querySelector('[class*="flex-col"], [class*="flex flex-col"]') ||
                           link.querySelector('[class*="flex-1"]') ||
                           link.parentElement?.querySelector('[class*="flex-1"]');

      if (colContainer && !colContainer.classList.contains('fomo-ext-btn-group')) {
        colContainer.appendChild(btnGroup);
      } else {
        link.insertAdjacentElement('afterend', btnGroup);
      }
    });
  }

  /**
   * Clean up injected list buttons
   */
  function removeListButtons() {
    document.querySelectorAll('.fomo-ext-list-group, .fomo-gmgn-list-btn').forEach(el => el.remove());
    document.querySelectorAll('[data-fomo-ext-row], [data-fomo-gmgn-row]').forEach(el => {
      el.removeAttribute('data-fomo-ext-row');
      el.removeAttribute('data-fomo-gmgn-row');
    });
  }

  /**
   * Clean up token page elements
   */
  function removeTokenPageElements() {
    document.querySelectorAll('.fomo-ext-header-group, #fomo-ext-header-action, #fomo-ext-floating-container, .fomo-gmgn-header-btn, #fomo-gmgn-header-action, #fomo-gmgn-floating-action').forEach(el => el.remove());
  }

  /**
   * Full cleanup and rescan
   */
  function cleanupAndRescan() {
    removeListButtons();
    removeTokenPageElements();
    runScan();
  }

  /**
   * Main scan & inject pass
   */
  function runScan() {
    injectTokenPage();
    injectTokenList();
  }

  // Debounced scanner for DOM mutations & performance
  let scanTimeout = null;
  function debouncedScan() {
    if (scanTimeout) cancelAnimationFrame(scanTimeout);
    scanTimeout = requestAnimationFrame(() => {
      runScan();
    });
  }

  // Observer for dynamic React SPA rendering
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i];
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) {
      debouncedScan();
    }
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true
  });

  // Watch SPA history navigation
  const originalPushState = history.pushState;
  history.pushState = function () {
    originalPushState.apply(this, arguments);
    debouncedScan();
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function () {
    originalReplaceState.apply(this, arguments);
    debouncedScan();
  };

  window.addEventListener('popstate', debouncedScan);

  // Periodic safety check for lazy-loaded/virtualized token lists
  setInterval(runScan, 2000);

  // Initial execution
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runScan);
  } else {
    runScan();
  }

})();
