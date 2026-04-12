// CommonJS polyfill file for older Node environments. This file is required with
// node --require so it must be CommonJS (.cjs) when the project uses "type":"module".

try {
  if (typeof globalThis.crypto === 'undefined' || typeof globalThis.crypto.getRandomValues !== 'function') {
    const { webcrypto } = require('crypto');
    if (webcrypto && typeof webcrypto.getRandomValues === 'function') {
      globalThis.crypto = webcrypto;
    }
  }
} catch (e) {
  // ignore
}

module.exports = {};
