import { STORAGE_KEYS } from './constants';

const debugToggle = document.getElementById('debug-toggle') as HTMLInputElement;

chrome.storage.local.get(STORAGE_KEYS.debugLogsEnabled, (result) => {
  debugToggle.checked = result[STORAGE_KEYS.debugLogsEnabled] === true;
});

debugToggle.addEventListener('change', () => {
  chrome.storage.local.set({ [STORAGE_KEYS.debugLogsEnabled]: debugToggle.checked });
});
