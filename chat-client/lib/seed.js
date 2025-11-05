(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(true);
  } else {
    const api = factory(false);
    root.seedLib = api;
    root.fileToSeed = api.fileToSeed;
  }
})(typeof self !== 'undefined' ? self : this, function (isNodeRuntime) {
  let fs = null;
  let nodeCrypto = null;

  if (isNodeRuntime) {
    try {
      fs = require('fs');
      nodeCrypto = require('crypto');
    } catch (err) {
      fs = null;
      nodeCrypto = null;
      console.warn('[seed.js] Node dependencies unavailable:', err);
    }
  }

  function fallbackHash(buffer) {
    const bytes = new Uint8Array(buffer || 0);
    let hash = 2166136261 >>> 0; // FNV-1a 32-bit
    for (let i = 0; i < bytes.length; i++) {
      hash ^= bytes[i];
      hash = Math.imul(hash, 16777619);
    }
    const view = new DataView(new ArrayBuffer(4));
    view.setUint32(0, hash >>> 0);
    return view.buffer;
  }

  async function hashBuffer(buffer) {
    const gCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
    if (gCrypto && gCrypto.subtle && typeof gCrypto.subtle.digest === 'function') {
      return gCrypto.subtle.digest('SHA-256', buffer);
    }
    return fallbackHash(buffer);
  }

  async function fileToSeed(filePath = 'assets/skeleton/skeleton1/skeleton.png') {
    if (isNodeRuntime && fs && nodeCrypto) {
      const data = fs.readFileSync(filePath);
      const hash = nodeCrypto.createHash('sha256').update(data).digest();
      return hash.readUInt32BE(0) >>> 0;
    }

    if (typeof fetch === 'function') {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${filePath}: ${response.status} ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      const digestBuffer = await hashBuffer(buffer);
      const view = new DataView(digestBuffer);
      return view.getUint32(0) >>> 0;
    }

    throw new Error('fileToSeed is not supported in this environment.');
  }

  function fileToSeedSync(filePath = 'assets/skeleton/skeleton1/skeleton.png') {
    if (!(isNodeRuntime && fs && nodeCrypto)) {
      throw new Error('fileToSeedSync is only available in a Node.js environment.');
    }
    const data = fs.readFileSync(filePath);
    const hash = nodeCrypto.createHash('sha256').update(data).digest();
    return hash.readUInt32BE(0) >>> 0;
  }

  return { fileToSeed, fileToSeedSync };
});
