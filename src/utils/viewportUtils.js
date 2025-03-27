/**
 * Sets a CSS variable (--vh) based on the actual viewport height
 * This helps with mobile browsers where the viewport height can change
 * as the address bar appears/disappears
 */
export function setViewportHeight() {
  // Get the actual viewport height
  const vh = window.innerHeight * 0.01;
  // Set it as a CSS variable
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
