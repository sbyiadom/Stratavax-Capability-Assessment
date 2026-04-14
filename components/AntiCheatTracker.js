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

    // Detect tab switch
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('Tab switch');
      }
    };

    // Detect PrintScreen
    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        logViolation('Screenshot attempt');
        return false;
      }
    };

    // Detect right-click
    const handleContextMenu = (e) => {
      e.preventDefault();
      logViolation('Right-click attempt');
      return false;
    };

    // Add event listeners
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    // Add CSS to prevent selection
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        user-select: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.head.removeChild(style);
    };
  }, [isActive, sessionId]);

  return { violationCount: violationCountRef.current };
}
