/* UgnayPH — Pinoy Social Media App
 * Created by: Dominic R. Lanaja
 * Copyright © 2026. All Rights Reserved. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAccountCache } from '../app/services/cache.js';
function storage() {
  const rows = new Map();
  return {
    rows,
    get: async (k) => rows.get(k),
    put: async (k, v) => rows.set(k, structuredClone(v)),
    keys: async () => [...rows.keys()],
    remove: async (k) => rows.delete(k),
    clear: async () => rows.clear()
  };
}
test('private JSON is encrypted, key non-exportable, and reload requires authentication', async () => {
  const store = storage(),
    cache = createAccountCache(store);
  await cache.setAccount(7);
  await cache.put('/chats/8', '"etag"', { messages: ['private message'] });
  const row = store.rows.get('response:/chats/8');
  assert.ok(row.bytes instanceof ArrayBuffer);
  assert.equal(new TextDecoder().decode(row.bytes).includes('private message'), false);
  assert.equal(store.rows.get('key').extractable, false);
  const reload = createAccountCache(store);
  assert.equal(await reload.get('/chats/8'), null);
  await reload.setAccount(7);
  assert.deepEqual((await reload.get('/chats/8')).value, { messages: ['private message'] });
});
test('switching account and concurrent logout purge private data', async () => {
  const store = storage(),
    cache = createAccountCache(store);
  await cache.setAccount(7);
  await cache.put('/posts', '"a"', { posts: ['private'] });
  await cache.setAccount(8);
  assert.equal(await cache.get('/posts'), null);
  const pending = cache.put('/posts', '"b"', { posts: ['new'] });
  const clear = cache.clear();
  await Promise.all([pending, clear]);
  assert.equal(store.rows.size, 0);
});
test('tampering, mismatched resource and expired responses are rejected', async () => {
  const store = storage();
  let time = 0;
  const cache = createAccountCache(store, globalThis.crypto, () => time);
  await cache.setAccount(1);
  await cache.put('/posts', '"a"', { posts: ['secret'] });
  store.rows.set('response:/people', store.rows.get('response:/posts'));
  assert.equal(await cache.get('/people'), null);
  new Uint8Array(store.rows.get('response:/posts').bytes)[0] ^= 1;
  assert.equal(await cache.get('/posts'), null);
  await cache.put('/posts', '"b"', []);
  time = 15 * 60 * 1000;
  assert.equal(await cache.get('/posts'), null);
});
test('cache is bounded and unavailable storage does not break online use', async () => {
  const store = storage(),
    cache = createAccountCache(store);
  await cache.setAccount(1);
  for (let i = 0; i < 65; i++) await cache.put('/posts?before=' + i, '"tag"', [i]);
  assert.equal([...store.rows.keys()].filter((k) => k.startsWith('response:')).length, 60);
  await cache.put('/large', '"tag"', 'x'.repeat(256 * 1024));
  assert.equal(await cache.get('/large'), null);
  const failed = createAccountCache({
    get: async () => {
      throw Error('No storage');
    },
    clear: async () => {
      throw Error('No storage');
    }
  });
  await failed.setAccount(1);
  assert.equal(await failed.get('/posts'), undefined);
  await failed.clear();
});
