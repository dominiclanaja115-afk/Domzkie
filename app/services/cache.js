/* UgnayPH — Pinoy Social Media App
 * Created by: Dominic R. Lanaja
 * Copyright © 2026. All Rights Reserved. */
// Private response cache. Keys are non-exportable; nothing is read before fresh authentication.
// Cached responses are ONLY used after the server returns 304 after authorization.
const MAX_AGE = 15 * 60 * 1000;
const MAX_BYTES = 256 * 1024;
const MAX_ENTRIES = 60;
export function indexedDBStore() {
  let opened;
  function database() {
    return (opened ||= new Promise((resolve, reject) => {
      const request = indexedDB.open('ugnay-private-cache-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('entries');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Cache unavailable'));
    }));
  }
  async function transaction(mode, operation) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('entries', mode);
      const request = operation(tx.objectStore('entries'));
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Cache unavailable'));
    });
  }
  return {
    get: (key) => transaction('readonly', (store) => store.get(key)),
    put: (key, value) => transaction('readwrite', (store) => store.put(value, key)),
    keys: () => transaction('readonly', (store) => store.getAllKeys()),
    remove: (key) => transaction('readwrite', (store) => store.delete(key)),
    clear: () => transaction('readwrite', (store) => store.clear())
  };
}
export function createAccountCache(store, cryptoProvider = globalThis.crypto, clock = Date.now) {
  let account = null;
  let generation = 0;
  let queue = Promise.resolve();
  // Serialize writes and purges so an in-flight request cannot repopulate a signed-out cache.
  const serial = (fn) => {
    const next = queue.then(fn);
    queue = next.catch(() => {});
    return next.catch(() => undefined); // Storage failure must never prevent online use.
  };
  async function key() {
    let value = await store.get('key');
    if (!value) {
      value = await cryptoProvider.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt'
      ]);
      await store.put('key', value);
    }
    return value;
  }
  return {
    setAccount(id) {
      account = id;
      generation++;
      return serial(async () => {
        if ((await store.get('account')) !== id) {
          await store.clear();
          await store.put('account', id);
        }
      });
    },
    clear() {
      account = null;
      generation++;
      return serial(() => store.clear());
    },
    get(path) {
      const owner = account,
        version = generation;
      if (!owner) return Promise.resolve(null);
      return serial(async () => {
        if (generation !== version || (await store.get('account')) !== owner) return null;
        const row = await store.get('response:' + path);
        if (!row) return null;
        if (row.expires <= clock()) {
          await store.remove('response:' + path);
          return null;
        }
        try {
          const decoded = await cryptoProvider.subtle.decrypt(
            {
              name: 'AES-GCM',
              iv: row.iv,
              additionalData: new TextEncoder().encode(owner + ':' + path)
            },
            await key(),
            row.bytes
          );
          return JSON.parse(new TextDecoder().decode(decoded));
        } catch {
          await store.remove('response:' + path);
          return null;
        }
      });
    },
    put(path, etag, value) {
      const owner = account,
        version = generation;
      if (!owner || !etag) return Promise.resolve();
      const bytes = new TextEncoder().encode(JSON.stringify({ etag, value }));
      if (bytes.byteLength > MAX_BYTES) return Promise.resolve();
      return serial(async () => {
        if (generation !== version || (await store.get('account')) !== owner) return;
        const iv = cryptoProvider.getRandomValues(new Uint8Array(12));
        const encrypted = await cryptoProvider.subtle.encrypt(
          { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(owner + ':' + path) },
          await key(),
          bytes
        );
        await store.put('response:' + path, { iv, bytes: encrypted, expires: clock() + MAX_AGE });
        const keys = (await store.keys()).filter((k) => k.startsWith('response:'));
        if (keys.length > MAX_ENTRIES) {
          const rows = await Promise.all(
            keys.map(async (k) => ({ k, expires: (await store.get(k)).expires }))
          );
          rows.sort((a, b) => a.expires - b.expires);
          for (const row of rows.slice(0, keys.length - MAX_ENTRIES)) await store.remove(row.k);
        }
      });
    }
  };
}
