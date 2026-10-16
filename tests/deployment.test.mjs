/* UgnayPH — Pinoy Social Media App
 * Created by: Dominic R. Lanaja
 * Copyright © 2026. All Rights Reserved. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serverOrigin, verifyServer } from '../scripts/verify-server.mjs';
test('release origin requires HTTPS and rejects credentials, local hosts and extra paths', () => {
  assert.equal(serverOrigin('https://community.example.org/'), 'https://community.example.org');
  for (const url of [
    '',
    'http://example.org',
    'https://localhost',
    'https://127.0.0.1',
    'https://a:b@example.org',
    'https://example.org/path',
    'https://example.org?x=1',
    'https://example.org/#x'
  ])
    assert.throws(() => serverOrigin(url));
});
test('live backend gate rejects demo, incompatible, unhealthy and network failures', async () => {
  const request =
    (config, healthy = true) =>
    async (url) =>
      new Response(
        JSON.stringify(
          url.endsWith('/healthz')
            ? { app: 'ph.ugnay.app', status: healthy ? 'ok' : 'down' }
            : config
        )
      );
  const valid = { app: 'ph.ugnay.app', version: '1.1', demo: false };
  await verifyServer('https://community.example.org', request(valid));
  await assert.rejects(
    verifyServer('https://community.example.org', request({ ...valid, demo: true }))
  );
  await assert.rejects(
    verifyServer('https://community.example.org', request({ ...valid, version: '1.0' }))
  );
  await assert.rejects(verifyServer('https://community.example.org', request(valid, false)));
  await assert.rejects(
    verifyServer('https://community.example.org', async () => {
      throw Error('offline');
    })
  );
});
