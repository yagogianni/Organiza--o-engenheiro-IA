// public/js/storage-local.js - Local Storage Management
// Status: FASE 1 - Browser localStorage for UI state

const STORAGE_PREFIX = 'prospec_';

/**
 * Save theme preference
 */
export function saveTheme(theme) {
  localStorage.setItem(`${STORAGE_PREFIX}theme`, theme);
}

/**
 * Get theme preference
 */
export function getTheme() {
  return localStorage.getItem(`${STORAGE_PREFIX}theme`) || 'light';
}

/**
 * Save last active tab
 */
export function saveLastTab(tabName) {
  localStorage.setItem(`${STORAGE_PREFIX}lastTab`, tabName);
}

/**
 * Get last active tab
 */
export function getLastTab() {
  return localStorage.getItem(`${STORAGE_PREFIX}lastTab`) || 'nova-prospec';
}

/**
 * Save form draft (before submission)
 */
export function saveDraft(formData) {
  localStorage.setItem(`${STORAGE_PREFIX}draft`, JSON.stringify(formData));
}

/**
 * Get form draft
 */
export function getDraft() {
  const draft = localStorage.getItem(`${STORAGE_PREFIX}draft`);
  return draft ? JSON.parse(draft) : null;
}

/**
 * Clear form draft
 */
export function clearDraft() {
  localStorage.removeItem(`${STORAGE_PREFIX}draft`);
}

/**
 * Save search/filter state
 */
export function saveFilterState(filters) {
  localStorage.setItem(`${STORAGE_PREFIX}filters`, JSON.stringify(filters));
}

/**
 * Get search/filter state
 */
export function getFilterState() {
  const state = localStorage.getItem(`${STORAGE_PREFIX}filters`);
  return state ? JSON.parse(state) : {};
}

/**
 * Save recently viewed prospect
 */
export function saveLastViewedProspect(prospectId) {
  localStorage.setItem(`${STORAGE_PREFIX}lastViewedProspect`, prospectId);
}

/**
 * Get recently viewed prospect
 */
export function getLastViewedProspect() {
  return localStorage.getItem(`${STORAGE_PREFIX}lastViewedProspect`);
}

/**
 * Clear all app data
 */
export function clearAllData() {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(STORAGE_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Debug: Show all stored data
 */
export function debugShowStorage() {
  const data = {};
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(STORAGE_PREFIX)) {
      data[key] = localStorage.getItem(key);
    }
  });
  console.table(data);
}
