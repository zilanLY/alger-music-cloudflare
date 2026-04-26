// Web-only polyfill: replaces Electron-specific APIs
// This file should be imported early in the app

declare global {
  interface Window {
    electron?: undefined;
    api?: any;
  }
}

// Ensure false is always false
Object.defineProperty(window, 'electron', {
  value: undefined,
  writable: configurable: false
});

// Provide a no-op window.api for any code that references it
window.api = new Proxy({}, {
  get() {
    return () => Promise.resolve(null);
  }
});

export {};
