// public/js/ui.js - DOM Manipulation & UI Utilities
// Status: FASE 1 - Placeholder (most UI logic in app.js for Fase 1)

/**
 * Show element
 */
export function show(elementId) {
  const element = document.getElementById(elementId);
  if (element) element.style.display = 'block';
}

/**
 * Hide element
 */
export function hide(elementId) {
  const element = document.getElementById(elementId);
  if (element) element.style.display = 'none';
}

/**
 * Toggle element visibility
 */
export function toggle(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = element.style.display === 'none' ? 'block' : 'none';
  }
}

/**
 * Set text content
 */
export function setText(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = text;
}

/**
 * Set HTML content
 */
export function setHTML(elementId, html) {
  const element = document.getElementById(elementId);
  if (element) element.innerHTML = html;
}

/**
 * Add class to element
 */
export function addClass(elementId, className) {
  const element = document.getElementById(elementId);
  if (element) element.classList.add(className);
}

/**
 * Remove class from element
 */
export function removeClass(elementId, className) {
  const element = document.getElementById(elementId);
  if (element) element.classList.remove(className);
}

/**
 * Disable button
 */
export function disableButton(buttonId) {
  const button = document.getElementById(buttonId);
  if (button) {
    button.disabled = true;
    button.style.opacity = '0.5';
    button.style.cursor = 'not-allowed';
  }
}

/**
 * Enable button
 */
export function enableButton(buttonId) {
  const button = document.getElementById(buttonId);
  if (button) {
    button.disabled = false;
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
  }
}

/**
 * Focus element
 */
export function focus(elementId) {
  const element = document.getElementById(elementId);
  if (element) element.focus();
}

/**
 * Clear form
 */
export function clearForm(formId) {
  const form = document.getElementById(formId);
  if (form) form.reset();
}

/**
 * Scroll to element
 */
export function scrollTo(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * Show modal/dialog (for future use)
 */
export function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'flex';
}

/**
 * Hide modal/dialog (for future use)
 */
export function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
}
