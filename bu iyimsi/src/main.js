/**
 * Main entry point for the Akılda Kal application
 * This file will be the entry point after the refactoring is complete
 */

// For now, this is a placeholder that will be populated during the refactoring
// The existing script.js will continue to work until we migrate functionality

console.log('Vite build system initialized');
console.log('ES6 modules supported');

// Export a simple function to verify module system works
export function initApp() {
  console.log('Application initialized with Vite');
}

// Auto-initialize for now
if (typeof window !== 'undefined') {
  initApp();
}
