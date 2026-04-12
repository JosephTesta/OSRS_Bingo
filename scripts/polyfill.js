// Ensure a web-crypto-compatible globalThis.crypto exists for environments
// where Node's globalThis.crypto.getRandomValues may be missing (older Node).
// This is a small, safe polyfill that uses Node's built-in webcrypto when available.

try {
  if (typeof globalThis.crypto === 'undefined' || typeof globalThis.crypto.getRandomValues !== 'function') {
    // Node's webcrypto is available via require('crypto').webcrypto in Node 16.0+
    const { webcrypto } = require('crypto');
    if (webcrypto && typeof webcrypto.getRandomValues === 'function') {
      globalThis.crypto = webcrypto;
    }
  }
} catch (e) {
  // If anything goes wrong, silently continue — the app may still fail and user should upgrade Node.
}

module.exports = {};
