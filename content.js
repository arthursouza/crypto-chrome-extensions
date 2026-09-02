/**
 * FOMO to GMGN Chrome Extension - Content Script
 * Injects GMGN navigation and trading buttons into fomo.family
 */

(function () {
  'use strict';

  // Prevent multiple executions in the same frame
  if (window.__FOMO_GMGN_INJECTED__) return;
  window.__FOMO_GMGN_INJECTED__ = true;

  // Default configuration
  let config = {
    showOnList: true,
    showOnTokenPage: true,
    showFloatingButton: false, // Default false to avoid duplicate visual noise
    openInNewTab: true,
    customRefCode: ''
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

  // GMGN SVG Icon
  const GMGN_ICON_SVG = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM8.5 8C9.33 8 10 8.67 10 9.5C10 10.33 9.33 11 8.5 11C7.67 11 7 10.33 7 9.5C7 8.67 7.67 8 8.5 8ZM15.5 8C16.33 8 17 8.67 17 9.5C17 10.33 16.33 11 15.5 11C14.67 11 14 10.33 14 9.5C14 8.67 14.67 8 15.5 8ZM12 17.5C9.67 17.5 7.69 16.04 6.89 14H17.11C16.31 16.04 14.33 17.5 12 17.5Z" fill="currentColor"/>
    </svg>
  `;

  const EXTERNAL_LINK_SVG = `
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 2px; flex-shrink: 0;">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
  `;

  // Comprehensive chain mapping for GMGN URL routing
  const CHAIN_MAP = {
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

  /**
   * Normalizes chain identifier to match GMGN URL format
   */
  function normalizeChain(chainStr, tokenAddress = '') {
    if (chainStr) {
      const clean = String(chainStr).toLowerCase().trim();
      if (CHAIN_MAP[clean]) {
        return CHAIN_MAP[clean];
      }
      // If a valid chain slug is present in URL, preserve it
      if (clean && clean !== 'token' && clean !== 'tokens') {
        return clean;
      }
    }

    // Heuristics based on contract address format only if chainStr was empty
    if (tokenAddress) {
      if (isSolanaAddress(tokenAddress)) return 'sol';
      if (tokenAddress.startsWith('0x')) return 'base';
    }

    return 'sol';
  }

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
   * Generates GMGN URL for token and chain
   */
  function buildGmgnUrl(chain, address) {
    const normalizedChain = normalizeChain(chain, address);
    let url = `https://gmgn.ai/${normalizedChain}/token/${address}`;
    if (config.customRefCode && config.customRefCode.trim()) {
      const ref = encodeURIComponent(config.customRefCode.trim());
      url += `?ref=${ref}`;
    }
    return url;
  }

  /**
   * Handles opening the GMGN URL safely
   */
  function handleOpenGmgn(e, url) {
    e.stopPropagation();
    e.preventDefault();
    if (config.openInNewTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  }

  /**
   * Creates a GMGN button element
   */
  function createGmgnButton(chain, address, variant = 'list') {
    const gmgnUrl = buildGmgnUrl(chain, address);
    const normalizedChain = normalizeChain(chain, address);

    const btn = document.createElement('a');
    btn.href = gmgnUrl;
    btn.target = config.openInNewTab ? '_blank' : '_self';
    btn.rel = 'noopener noreferrer';
    btn.className = `fomo-gmgn-btn fomo-gmgn-${variant}-btn`;
    btn.setAttribute('data-fomo-gmgn', 'true');
    btn.setAttribute('data-token-address', address);
    btn.setAttribute('data-token-chain', normalizedChain);
    btn.title = `Open on GMGN (${normalizedChain.toUpperCase()})`;

    let innerContent = '';
    if (variant === 'list') {
      innerContent = `
        ${GMGN_ICON_SVG}
        <span class="fomo-gmgn-label">GMGN</span>
      `;
    } else if (variant === 'header') {
      innerContent = `
        ${GMGN_ICON_SVG}
        <span class="fomo-gmgn-label">Trade on GMGN</span>
        <span class="fomo-gmgn-chain-badge">${normalizedChain}</span>
        ${EXTERNAL_LINK_SVG}
      `;
    } else if (variant === 'floating') {
      innerContent = `
        <span class="fomo-gmgn-icon">${GMGN_ICON_SVG}</span>
        <span>Open in GMGN</span>
        <span class="fomo-gmgn-chain-badge">${normalizedChain}</span>
      `;
    }

    btn.innerHTML = innerContent;
    btn.addEventListener('click', (e) => handleOpenGmgn(e, gmgnUrl));

    return btn;
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
   * Injects GMGN button on Token Detail Page
   */
  function injectTokenPage() {
    const tokenInfo = getTokenPageInfo();
    if (!tokenInfo) {
      removeTokenPageElements();
      return;
    }

    const { chain, address } = tokenInfo;

    // 1. Handle Floating Action Button
    if (config.showFloatingButton) {
      let floatingBtn = document.getElementById('fomo-gmgn-floating-action');
      if (!floatingBtn) {
        floatingBtn = createGmgnButton(chain, address, 'floating');
        floatingBtn.id = 'fomo-gmgn-floating-action';
        floatingBtn.className = 'fomo-gmgn-floating-btn';
        document.body.appendChild(floatingBtn);
      } else {
        if (floatingBtn.getAttribute('data-token-address') !== address ||
            floatingBtn.getAttribute('data-token-chain') !== normalizeChain(chain, address)) {
          const newBtn = createGmgnButton(chain, address, 'floating');
          newBtn.id = 'fomo-gmgn-floating-action';
          newBtn.className = 'fomo-gmgn-floating-btn';
          floatingBtn.replaceWith(newBtn);
        }
      }
    } else {
      const existingFloating = document.getElementById('fomo-gmgn-floating-action');
      if (existingFloating) existingFloating.remove();
    }

    if (!config.showOnTokenPage) {
      const existingHeader = document.getElementById('fomo-gmgn-header-action');
      if (existingHeader) existingHeader.remove();
      return;
    }

    // 2. Handle Header Action Button (Ensure ONLY ONE header button exists)
    const existingHeaderBtn = document.getElementById('fomo-gmgn-header-action');
    if (existingHeaderBtn) {
      if (existingHeaderBtn.getAttribute('data-token-address') === address &&
          existingHeaderBtn.getAttribute('data-token-chain') === normalizeChain(chain, address)) {
        return; // Current button is active and up to date
      } else {
        existingHeaderBtn.remove();
      }
    }

    // Clean up any stray duplicate header buttons
    document.querySelectorAll('.fomo-gmgn-header-btn').forEach(el => el.remove());

    // Locate the best target container in FOMO's token header
    // Try social links row first (Twitter, Telegram, Website, Solscan, etc.)
    const socialLinks = Array.from(document.querySelectorAll('a[href*="twitter.com"], a[href*="x.com"], a[href*="t.me"], a[href*="solscan.io"], a[href*="etherscan.io"], a[href*="basescan.org"], a[href*="bscscan.com"]'));

    let targetContainer = null;
    if (socialLinks.length > 0) {
      targetContainer = socialLinks[0].parentElement;
    }

    // Fallback containers: copy address button container or title container
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
      const headerBtn = createGmgnButton(chain, address, 'header');
      headerBtn.id = 'fomo-gmgn-header-action';
      targetContainer.appendChild(headerBtn);
    }
  }

  /**
   * Scans and injects GMGN buttons into Token List rows and cards
   */
  function injectTokenList() {
    if (!config.showOnList) {
      removeListButtons();
      return;
    }

    const tokenPageInfo = getTokenPageInfo();
    const currentPageAddress = tokenPageInfo ? tokenPageInfo.address.toLowerCase() : null;

    // Find all links referencing tokens: /tokens/:chain/:address
    const tokenLinks = Array.from(document.querySelectorAll('a[href*="/tokens/"], a[href*="/token/"]'));

    tokenLinks.forEach((link) => {
      // Skip if this link is an injected GMGN button or inside one
      if (link.classList.contains('fomo-gmgn-btn') || link.closest('.fomo-gmgn-btn')) {
        return;
      }

      const href = link.getAttribute('href') || '';
      const match = href.match(/\/tokens?\/([^\/]+)\/([^\/\?#]+)/i);
      if (!match) return;

      const chain = match[1];
      const address = match[2];

      if (!isValidTokenAddress(address)) return;

      // On token detail page, do NOT inject list buttons for the main token itself in the header/breadcrumb
      if (currentPageAddress && address.toLowerCase() === currentPageAddress) {
        // If it's the main token on the detail page, ignore to prevent duplicate stacked buttons
        return;
      }

      // If the link is just an image / avatar wrapper with no text, skip (we only attach to the symbol/name link)
      if (link.querySelector('img') && !link.textContent.trim()) {
        return;
      }

      // Find row/card container
      const rowContainer = link.closest('tr, [role="row"], [data-row], li') || 
                           link.closest('[class*="tokenRow"], [class*="TokenRow"], [class*="Card"], [class*="card"]') ||
                           link.parentElement;

      if (!rowContainer) return;

      // Prevent duplicate injection in the same row
      if (rowContainer.querySelector(`.fomo-gmgn-list-btn[data-token-address="${address}"]`)) {
        return;
      }

      // Mark row container to ensure only one button is injected
      if (rowContainer.hasAttribute('data-fomo-gmgn-row') && rowContainer.getAttribute('data-fomo-gmgn-row') === address) {
        return;
      }

      const gmgnBtn = createGmgnButton(chain, address, 'list');
      rowContainer.setAttribute('data-fomo-gmgn-row', address);

      // Look for best inline placement in the row
      const targetArea = link.querySelector('[class*="flex items-center"]') || 
                         link.parentElement?.querySelector('[class*="flex items-center"]') || 
                         link;

      if (targetArea && targetArea !== link && !targetArea.classList.contains('fomo-gmgn-btn')) {
        targetArea.appendChild(gmgnBtn);
      } else {
        link.insertAdjacentElement('afterend', gmgnBtn);
      }
    });
  }

  /**
   * Clean up all injected list buttons
   */
  function removeListButtons() {
    document.querySelectorAll('.fomo-gmgn-list-btn').forEach(el => el.remove());
    document.querySelectorAll('[data-fomo-gmgn-row]').forEach(el => el.removeAttribute('data-fomo-gmgn-row'));
  }

  /**
   * Clean up token page elements
   */
  function removeTokenPageElements() {
    document.querySelectorAll('.fomo-gmgn-header-btn, #fomo-gmgn-header-action, #fomo-gmgn-floating-action').forEach(el => el.remove());
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

  // Watch SPA history navigation (pushState, replaceState, popstate)
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
