// utils/proctoringService.js - COMPLETE PROCTORING SERVICE WITH URL TRACKING

class ProctoringService {
  constructor() {
    this.violations = [];
    this.tabSwitches = [];
    this.copyPasteAttempts = [];
    this.rightClickAttempts = [];
    this.externalUrls = [];
    this.domainVisits = {};
    this.startTime = null;
    this.isActive = false;
    this.previousUrl = null;
    this.urlVisitStartTime = null;
    this.assessmentId = null;
    this.userId = null;
    this.tabSwitchStartTime = null;
    this.windowBlurTime = null;
    this.intervalId = null;
    
    // Bind methods to preserve this context
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleUrlChange = this.handleUrlChange.bind(this);
    this.handleCopy = this.handleCopy.bind(this);
    this.handlePaste = this.handlePaste.bind(this);
    this.handleRightClick = this.handleRightClick.bind(this);
    this.handleWindowBlur = this.handleWindowBlur.bind(this);
    this.handleWindowFocus = this.handleWindowFocus.bind(this);
    this.handleFullscreenChange = this.handleFullscreenChange.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.checkUrl = this.checkUrl.bind(this);
  }

  // ============================================================
  // START PROCTORING
  // ============================================================
  start(assessmentId, userId) {
    if (this.isActive) {
      console.warn('[Proctoring] Service already active');
      return this;
    }

    this.startTime = new Date();
    this.isActive = true;
    this.assessmentId = assessmentId;
    this.userId = userId;
    this.previousUrl = window.location.href;
    this.urlVisitStartTime = Date.now();
    
    console.log('[Proctoring] Started with URL tracking for assessment:', assessmentId);
    
    // Track visibility changes (tab switches)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Track URL changes (SPA navigation)
    window.addEventListener('popstate', this.handleUrlChange);
    window.addEventListener('hashchange', this.handleUrlChange);
    
    // Track copy/paste
    document.addEventListener('copy', this.handleCopy);
    document.addEventListener('paste', this.handlePaste);
    
    // Track right-click
    document.addEventListener('contextmenu', this.handleRightClick);
    
    // Track focus/blur (window switching)
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('focus', this.handleWindowFocus);
    
    // Track fullscreen exit
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    
    // Track beforeunload (page close)
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    
    // Track iframe clicks (for embedded content)
    document.addEventListener('click', this.handleClick, true);
    
    // Track keyboard shortcuts (Ctrl+C, Ctrl+V, etc.)
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Check URL periodically (for SPA navigation that doesn't trigger events)
    this.intervalId = setInterval(this.checkUrl, 1000);
    
    // Log initial URL
    console.log('[Proctoring] Initial URL:', window.location.href);
    
    return this;
  }

  // ============================================================
  // CHECK URL (periodic check for SPA navigation)
  // ============================================================
  checkUrl() {
    if (!this.isActive) return;
    
    const currentUrl = window.location.href;
    if (this.previousUrl && this.previousUrl !== currentUrl) {
      this.handleUrlChange();
    }
    this.previousUrl = currentUrl;
  }

  // ============================================================
  // TRACK URL CHANGES (the site/domain they visit)
  // ============================================================
  handleUrlChange() {
    if (!this.isActive) return;
    
    const currentUrl = window.location.href;
    const currentDomain = this.extractDomain(currentUrl);
    const assessmentDomain = window.location.hostname;
    
    // Skip if it's the same URL
    if (this.previousUrl === currentUrl) return;
    
    // Calculate duration on previous URL
    const duration = this.urlVisitStartTime 
      ? (Date.now() - this.urlVisitStartTime) / 1000 
      : null;
    
    // Check if we're still on the assessment domain
    const isAssessmentDomain = currentDomain === assessmentDomain || 
                               currentUrl.includes(assessmentDomain);
    
    // Track domain visits
    if (currentDomain) {
      if (!this.domainVisits[currentDomain]) {
        this.domainVisits[currentDomain] = 0;
      }
      this.domainVisits[currentDomain]++;
    }
    
    // Create URL change record
    const urlChange = {
      type: 'url_change',
      from: this.previousUrl,
      to: currentUrl,
      fromDomain: this.extractDomain(this.previousUrl),
      toDomain: currentDomain,
      isAssessmentDomain: isAssessmentDomain,
      timestamp: new Date().toISOString(),
      duration: duration,
      action: isAssessmentDomain ? 'internal_navigation' : 'external_visit'
    };
    
    // If it's an external site, treat it as a tab switch violation
    if (!isAssessmentDomain && currentDomain) {
      // Track external URL
      this.externalUrls.push({
        url: currentUrl,
        domain: currentDomain,
        timestamp: urlChange.timestamp,
        duration: duration,
        fromUrl: this.previousUrl
      });
      
      this.tabSwitches.push({
        ...urlChange,
        type: 'external_site_visit',
        violationType: 'tab_switch_external',
        severity: 'high'
      });
      
      this.violations.push({
        type: 'tab_switch_external',
        timestamp: urlChange.timestamp,
        details: {
          from: this.previousUrl,
          to: currentUrl,
          toDomain: currentDomain,
          duration: duration
        }
      });
      
      console.log(`[Proctoring] 🔴 External site visited: ${currentDomain} (${currentUrl})`);
    } else {
      // Internal navigation (within the assessment)
      this.tabSwitches.push({
        ...urlChange,
        type: 'internal_navigation',
        violationType: 'tab_switch_internal',
        severity: 'low'
      });
      
      console.log(`[Proctoring] 🟢 Internal navigation: ${currentUrl}`);
    }
    
    this.previousUrl = currentUrl;
    this.urlVisitStartTime = Date.now();
  }

  // ============================================================
  // TRACK EXTERNAL LINK CLICKS (candidate clicks a link)
  // ============================================================
  handleClick(e) {
    if (!this.isActive) return;
    
    const target = e.target.closest('a');
    if (target && target.href) {
      const href = target.href;
      const linkDomain = this.extractDomain(href);
      const assessmentDomain = window.location.hostname;
      
      // Check if it's an external link
      if (linkDomain && !href.includes(assessmentDomain) && linkDomain !== assessmentDomain) {
        console.log(`[Proctoring] External link clicked: ${href}`);
        
        this.violations.push({
          type: 'external_link_click',
          timestamp: new Date().toISOString(),
          details: {
            url: href,
            domain: linkDomain,
            text: target.textContent || target.innerText || 'No text',
            href: target.href
          }
        });
        
        // Track as a tab switch attempt
        this.tabSwitches.push({
          type: 'external_link_click',
          from: window.location.href,
          to: href,
          toDomain: linkDomain,
          timestamp: new Date().toISOString(),
          severity: 'high'
        });
        
        // Add to external URLs
        this.externalUrls.push({
          url: href,
          domain: linkDomain,
          timestamp: new Date().toISOString(),
          fromUrl: window.location.href,
          via: 'link_click'
        });
      }
    }
  }

  // ============================================================
  // HANDLE VISIBILITY CHANGE (tab switching)
  // ============================================================
  handleVisibilityChange() {
    if (!this.isActive) return;
    
    if (document.hidden) {
      // Tab hidden - user switched away
      this.tabSwitchStartTime = Date.now();
      
      const currentUrl = window.location.href;
      const currentDomain = this.extractDomain(currentUrl);
      
      this.tabSwitches.push({
        type: 'tab_switch',
        timestamp: new Date().toISOString(),
        action: 'hidden',
        url: currentUrl,
        domain: currentDomain,
        isExternal: true,
        severity: 'high'
      });
      
      this.violations.push({
        type: 'tab_switch',
        timestamp: new Date().toISOString(),
        details: {
          action: 'hidden',
          url: currentUrl,
          domain: currentDomain
        }
      });
      
      console.log('[Proctoring] 🔴 Tab switched away');
    } else {
      // Tab visible - user returned
      const duration = this.tabSwitchStartTime 
        ? (Date.now() - this.tabSwitchStartTime) / 1000 
        : null;
      
      const currentUrl = window.location.href;
      const currentDomain = this.extractDomain(currentUrl);
      
      this.tabSwitches.push({
        type: 'tab_switch',
        timestamp: new Date().toISOString(),
        action: 'visible',
        url: currentUrl,
        domain: currentDomain,
        isExternal: false,
        duration: duration
      });
      
      console.log('[Proctoring] 🟢 Tab switched back (was away for ' + duration + 's)');
    }
  }

  // ============================================================
  // HANDLE WINDOW BLUR (clicking outside the window)
  // ============================================================
  handleWindowBlur() {
    if (!this.isActive) return;
    
    this.windowBlurTime = Date.now();
    console.log('[Proctoring] Window lost focus');
  }

  handleWindowFocus() {
    if (!this.isActive) return;
    
    const duration = this.windowBlurTime 
      ? (Date.now() - this.windowBlurTime) / 1000 
      : null;
    
    if (duration && duration > 3) { // More than 3 seconds
      this.violations.push({
        type: 'window_switch',
        timestamp: new Date().toISOString(),
        details: {
          duration: duration,
          action: 'focus_restored'
        }
      });
      
      console.log('[Proctoring] Window focus restored after ' + duration + 's');
    }
  }

  // ============================================================
  // HANDLE FULLSCREEN CHANGE
  // ============================================================
  handleFullscreenChange() {
    if (!this.isActive) return;
    
    const isFullscreen = !!document.fullscreenElement;
    
    if (!isFullscreen) {
      this.violations.push({
        type: 'fullscreen_exit',
        timestamp: new Date().toISOString(),
        details: {
          action: 'exited_fullscreen'
        }
      });
      
      console.log('[Proctoring] Candidate exited fullscreen');
    }
  }

  // ============================================================
  // TRACK COPY/PASTE
  // ============================================================
  handleCopy(e) {
    if (!this.isActive) return;
    
    const selection = window.getSelection();
    const copiedText = selection ? selection.toString() : '';
    
    this.copyPasteAttempts.push({
      type: 'copy',
      timestamp: new Date().toISOString(),
      textLength: copiedText.length,
      textPreview: copiedText.substring(0, 100),
      element: e.target.tagName
    });
    
    this.violations.push({
      type: 'copy_paste',
      timestamp: new Date().toISOString(),
      details: {
        action: 'copy',
        textLength: copiedText.length,
        element: e.target.tagName
      }
    });
    
    console.log('[Proctoring] 📋 Copy attempt detected (length: ' + copiedText.length + ')');
  }

  handlePaste(e) {
    if (!this.isActive) return;
    
    const pastedText = e.clipboardData?.getData('text') || '';
    
    this.copyPasteAttempts.push({
      type: 'paste',
      timestamp: new Date().toISOString(),
      textLength: pastedText.length,
      textPreview: pastedText.substring(0, 100),
      element: e.target.tagName
    });
    
    this.violations.push({
      type: 'copy_paste',
      timestamp: new Date().toISOString(),
      details: {
        action: 'paste',
        textLength: pastedText.length,
        element: e.target.tagName
      }
    });
    
    console.log('[Proctoring] 📋 Paste attempt detected (length: ' + pastedText.length + ')');
  }

  // ============================================================
  // TRACK RIGHT-CLICK
  // ============================================================
  handleRightClick(e) {
    if (!this.isActive) return;
    
    // Get the element that was right-clicked
    const target = e.target;
    const elementInfo = {
      tag: target.tagName,
      id: target.id || 'none',
      className: target.className || 'none',
      text: target.textContent ? target.textContent.substring(0, 50) : 'none',
      src: target.src || null
    };
    
    this.rightClickAttempts.push({
      type: 'right_click',
      timestamp: new Date().toISOString(),
      element: elementInfo
    });
    
    this.violations.push({
      type: 'right_click',
      timestamp: new Date().toISOString(),
      details: {
        element: elementInfo
      }
    });
    
    console.log('[Proctoring] 🖱️ Right-click detected on:', target.tagName);
  }

  // ============================================================
  // TRACK KEYBOARD SHORTCUTS
  // ============================================================
  handleKeyDown(e) {
    if (!this.isActive) return;
    
    // Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (['c', 'v', 'x', 'a'].includes(key)) {
        console.log('[Proctoring] ⌨️ Keyboard shortcut detected: Ctrl+' + key);
        
        this.violations.push({
          type: 'keyboard_shortcut',
          timestamp: new Date().toISOString(),
          details: {
            shortcut: 'Ctrl+' + key.toUpperCase(),
            key: key,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey
          }
        });
      }
    }
    
    // F12 (dev tools)
    if (e.key === 'F12') {
      console.log('[Proctoring] F12 key pressed (dev tools)');
      this.violations.push({
        type: 'dev_tools_attempt',
        timestamp: new Date().toISOString(),
        details: {
          key: 'F12'
        }
      });
    }
  }

  // ============================================================
  // HANDLE BEFORE UNLOAD (candidate trying to leave)
  // ============================================================
  handleBeforeUnload(e) {
    if (!this.isActive) return;
    
    const currentUrl = window.location.href;
    
    // Log the exit attempt
    this.violations.push({
      type: 'page_exit_attempt',
      timestamp: new Date().toISOString(),
      details: {
        url: currentUrl,
        action: 'beforeunload'
      }
    });
    
    console.log('[Proctoring] Page exit attempt detected');
  }

  // ============================================================
  // HELPER: Extract domain from URL
  // ============================================================
  extractDomain(url) {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  }

  // ============================================================
  // GET FULL PROCTORING DATA
  // ============================================================
  getProctoringData() {
    const endTime = new Date();
    const duration = this.startTime 
      ? (endTime - this.startTime) / 1000 
      : 0;

    // Calculate risk level
    const riskScore = this.calculateRiskScore();
    let riskLevel = 'Low';
    if (riskScore > 70) riskLevel = 'High';
    else if (riskScore > 40) riskLevel = 'Medium';
    
    // Get unique external domains
    const uniqueExternalDomains = [...new Set(this.externalUrls.map(u => u.domain))];
    
    // Group external URLs by domain with counts
    const externalDomainCounts = {};
    this.externalUrls.forEach(url => {
      if (url.domain) {
        if (!externalDomainCounts[url.domain]) {
          externalDomainCounts[url.domain] = 0;
        }
        externalDomainCounts[url.domain]++;
      }
    });

    return {
      summary: {
        totalViolations: this.violations.length,
        tabSwitches: this.tabSwitches.length,
        copyPasteAttempts: this.copyPasteAttempts.length,
        rightClickAttempts: this.rightClickAttempts.length,
        externalUrlsVisited: this.externalUrls.length,
        uniqueExternalDomains: uniqueExternalDomains.length,
        duration: duration,
        startTime: this.startTime ? this.startTime.toISOString() : null,
        endTime: endTime.toISOString(),
        riskLevel: riskLevel,
        riskScore: riskScore
      },
      violations: this.violations,
      tabSwitches: this.tabSwitches,
      copyPasteAttempts: this.copyPasteAttempts,
      rightClickAttempts: this.rightClickAttempts,
      domainVisits: this.domainVisits,
      externalUrls: this.externalUrls,
      externalDomainCounts: externalDomainCounts,
      assessmentId: this.assessmentId,
      userId: this.userId,
      startUrl: this.previousUrl
    };
  }

  // ============================================================
  // CALCULATE RISK SCORE
  // ============================================================
  calculateRiskScore() {
    let score = 0;
    
    // Tab switches - high weight
    const externalTabSwitches = this.tabSwitches.filter(t => t.type === 'external_site_visit');
    score += externalTabSwitches.length * 10; // 10 points per external tab switch
    
    // Copy/paste attempts - high weight
    score += this.copyPasteAttempts.length * 15; // 15 points per copy/paste
    
    // Right clicks - medium weight
    score += this.rightClickAttempts.length * 5; // 5 points per right click
    
    // Fullscreen exits - medium weight
    const fullscreenExits = this.violations.filter(v => v.type === 'fullscreen_exit');
    score += fullscreenExits.length * 8; // 8 points per fullscreen exit
    
    // Window switches - medium weight
    const windowSwitches = this.violations.filter(v => v.type === 'window_switch');
    score += windowSwitches.length * 7; // 7 points per window switch
    
    // External link clicks - high weight
    const linkClicks = this.violations.filter(v => v.type === 'external_link_click');
    score += linkClicks.length * 12; // 12 points per external link click
    
    // Keyboard shortcuts - low weight
    const shortcuts = this.violations.filter(v => v.type === 'keyboard_shortcut');
    score += shortcuts.length * 3; // 3 points per shortcut
    
    // Dev tools attempts - high weight
    const devTools = this.violations.filter(v => v.type === 'dev_tools_attempt');
    score += devTools.length * 20; // 20 points per dev tools attempt
    
    // Page exit attempts - low weight
    const exitAttempts = this.violations.filter(v => v.type === 'page_exit_attempt');
    score += exitAttempts.length * 5; // 5 points per exit attempt
    
    // Cap at 100
    return Math.min(score, 100);
  }

  // ============================================================
  // STOP PROCTORING
  // ============================================================
  stop() {
    if (!this.isActive) {
      console.warn('[Proctoring] Service not active');
      return null;
    }
    
    this.isActive = false;
    
    // Clear interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Remove all event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('popstate', this.handleUrlChange);
    window.removeEventListener('hashchange', this.handleUrlChange);
    document.removeEventListener('copy', this.handleCopy);
    document.removeEventListener('paste', this.handlePaste);
    document.removeEventListener('contextmenu', this.handleRightClick);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('focus', this.handleWindowFocus);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown);
    
    const data = this.getProctoringData();
    console.log('[Proctoring] Stopped with data:', data);
    
    return data;
  }

  // ============================================================
  // GET REAL-TIME STATUS
  // ============================================================
  getStatus() {
    return {
      isActive: this.isActive,
      currentUrl: window.location.href,
      currentDomain: this.extractDomain(window.location.href),
      assessmentId: this.assessmentId,
      userId: this.userId,
      violationsCount: this.violations.length,
      tabSwitchesCount: this.tabSwitches.length,
      externalUrlsCount: this.externalUrls.length,
      elapsedTime: this.startTime 
        ? (Date.now() - this.startTime.getTime()) / 1000 
        : 0,
      riskLevel: this.calculateRiskScore() > 70 ? 'High' : 
                  this.calculateRiskScore() > 40 ? 'Medium' : 'Low'
    };
  }

  // ============================================================
  // RESET (clear all data)
  // ============================================================
  reset() {
    this.violations = [];
    this.tabSwitches = [];
    this.copyPasteAttempts = [];
    this.rightClickAttempts = [];
    this.externalUrls = [];
    this.domainVisits = {};
    this.startTime = null;
    this.isActive = false;
    this.previousUrl = null;
    this.urlVisitStartTime = null;
    this.assessmentId = null;
    this.userId = null;
    this.tabSwitchStartTime = null;
    this.windowBlurTime = null;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('[Proctoring] Reset');
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================
let proctoringInstance = null;

export function getProctoringService() {
  if (!proctoringInstance) {
    proctoringInstance = new ProctoringService();
  }
  return proctoringInstance;
}

export function startProctoring(assessmentId, userId) {
  const service = getProctoringService();
  service.start(assessmentId, userId);
  return service;
}

export function stopProctoring() {
  if (proctoringInstance) {
    const data = proctoringInstance.stop();
    proctoringInstance = null;
    return data;
  }
  return null;
}

export function getProctoringStatus() {
  if (proctoringInstance) {
    return proctoringInstance.getStatus();
  }
  return null;
}

export function resetProctoring() {
  if (proctoringInstance) {
    proctoringInstance.reset();
    proctoringInstance = null;
  }
}

export default ProctoringService;
