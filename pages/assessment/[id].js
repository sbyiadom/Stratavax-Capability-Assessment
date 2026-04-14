import { useEffect } from 'react';

const setupAntiCheat = () => {
  if (typeof window === 'undefined') return () => {};

  const preventCopy = (e) => {
    e.preventDefault();
    showWarning('⚠️ Copying is not allowed during the assessment.');
    return false;
  };
  
  const preventPaste = (e) => {
    e.preventDefault();
    showWarning('⚠️ Pasting is not allowed during the assessment.');
    return false;
  };
  
  const preventCut = (e) => {
    e.preventDefault();
    return false;
  };
  
  const detectScreenCapture = (e) => {
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      showWarning('⚠️ Screenshot capture is not allowed during the assessment.');
      return false;
    }
  };
  
  const showWarning = (message) => {
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      background: #f44336; color: white; padding: 10px 20px;
      border-radius: 8px; font-weight: bold; z-index: 10000;
      font-size: 14px;
    `;
    warning.textContent = message;
    document.body.appendChild(warning);
    setTimeout(() => warning.remove(), 2000);
  };
  
  document.addEventListener('copy', preventCopy);
  document.addEventListener('paste', preventPaste);
  document.addEventListener('cut', preventCut);
  document.addEventListener('keydown', detectScreenCapture);
  
  const style = document.createElement('style');
  style.textContent = `* { -webkit-user-select: none !important; user-select: none !important; }`;
  document.head.appendChild(style);

  return () => {
    document.removeEventListener('copy', preventCopy);
    document.removeEventListener('paste', preventPaste);
    document.removeEventListener('cut', preventCut);
    document.removeEventListener('keydown', detectScreenCapture);
    document.head.removeChild(style);
  };
};

export default function AntiCheatProvider({ children }) {
  useEffect(() => {
    const cleanup = setupAntiCheat();
    return () => cleanup();
  }, []);

  return children;
}
