import { useEffect, useRef } from 'react';
import { supabase } from '../supabase/client';

export function useAntiCheatTracking(sessionId, userId, assessmentId, isActive) {
  const violationCountRef = useRef(0);
  const warningShownRef = useRef({});

  const showWarning = (message) => {
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #f44336;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: bold;
      z-index: 10000;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    warning.textContent = `⚠️ ${message}`;
    document.body.appendChild(warning);
    setTimeout(() => warning.remove(), 3000);
  };

  const logViolation = async (violationType) => {
    if (!isActive || !sessionId) return;
    
    violationCountRef.current += 1;
    
    // Update violation count in session
    await supabase
      .from('assessment_sessions')
      .update({ 
        violation_count: violationCountRef.current 
      })
      .eq('id', sessionId);
    
    // Log violation
    await supabase
      .from('assessment_violations')
      .insert({
        session_id: sessionId,
        user_id: userId,
        assessment_id: assessmentId,
        violation_type: violationType
      });
    
    // Show warning
    showWarning(`${violationType}. Violation ${violationCountRef.current} of 3.`);
    
    // Auto-submit after 3 violations
    if (violationCountRef.current >= 3) {
      showWarning('Maximum violations reached. Assessment will be submitted.');
      setTimeout(() => {
        window.autoSubmitDueToViolations = true;
        document.getElementById('submit-assessment-btn')?.click();
      }, 2000);
    }
  };

  // Detect DevTools opening
  const detectDevTools = () => {
    const start = performance.now();
    debugger;
    const end = performance.now();
    // If debugger pauses execution (DevTools open), time difference will be > 100ms
    if (end - start > 100) {
      logViolation('DevTools opened');
    }
  };

  useEffect(() => {
    if (!isActive) return;

    // Prevent copy
    const handleCopy = (e) => {
      e.preventDefault();
      logViolation('Copy attempt');
      return false;
    };

    // Prevent paste
    const handlePaste = (e) => {
      e.preventDefault();
      logViolation('Paste attempt');
      return false;
    };

    // Prevent cut
    const handleCut = (e) => {
      e.preventDefault();
      logViolation('Cut attempt');
      return false;
    };

    // ===== TAB SWITCHING DETECTION REMOVED =====
    // The following code is intentionally omitted:
    // const handleVisibilityChange = () => { ... };

    // Detect PrintScreen and DevTools shortcuts
    const handleKeyDown = (e) => {
      // PrintScreen detection
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        logViolation('Screenshot attempt');
        return false;
      }
      
      // DevTools detection - F12
      if (e.key === 'F12') {
        e.preventDefault();
        logViolation('DevTools attempt (F12)');
        return false;
      }
      
      // DevTools detection - Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
        e.preventDefault();
        logViolation('DevTools attempt (Ctrl+Shift+I/J/C)');
        return false;
      }
      
      // View source detection - Ctrl+U
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        logViolation('View source attempt');
        return false;
      }
    };

    // Prevent right-click
    const handleContextMenu = (e) => {
      e.preventDefault();
      logViolation('Right-click attempt');
      return false;
    };

    // Periodic DevTools detection (checks every 5 seconds)
    const devToolsInterval = setInterval(() => {
      if (!isActive) return;
      
      // Method 1: Check window size difference (DevTools opens as separate window)
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      
      // If DevTools is open as a separate window, dimensions will change significantly
      if (widthDiff > 200 || heightDiff > 200) {
        logViolation('DevTools detected (window resize)');
      }
      
      // Method 2: Check element inspection via debugger
      const before = performance.now();
      debugger;
      const after = performance.now();
      if (after - before > 100) {
        logViolation('DevTools detected (debugger pause)');
      }
    }, 5000);

    // Add event listeners
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    // Tab switching event listener REMOVED
    // document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    // Add CSS to prevent text selection
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      // Tab switching event listener REMOVED
      // document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.head.removeChild(style);
      clearInterval(devToolsInterval);
    };
  }, [isActive, sessionId]);

  return { violationCount: violationCountRef.current };
}

export default useAntiCheatTracking;
