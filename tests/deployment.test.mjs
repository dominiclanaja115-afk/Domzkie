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

test('pending preview generates no endpoint and ordinary builds still require a live URL', async () => {
  const { mkdtempSync, readFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const script = new URL('../scripts/verify-server.mjs', import.meta.url);
  const cwd = mkdtempSync(join(tmpdir(), 'ugnay-pending-'));
  const env = { ...process.env };
  delete env.UGNAY_SERVER_URL;
  delete env.UGNAY_BUILD_CHECK_ONLY;
  delete env.UGNAY_PENDING_URL;
  try {
    const pending = spawnSync(process.execPath, [script.pathname], {
      cwd,
      env: { ...env, UGNAY_PENDING_URL: '1' },
      encoding: 'utf8'
    });
    assert.equal(pending.status, 0, pending.stderr);
    assert.match(
      readFileSync(join(cwd, 'build/gen/ph/ugnay/ServerConfig.java'), 'utf8'),
      /ORIGIN = "";/
    );
    const release = spawnSync(process.execPath, [script.pathname], { cwd, env, encoding: 'utf8' });
    assert.equal(release.status, 1);
    assert.match(release.stderr, /UGNAY_SERVER_URL must be/);
    const conflicting = spawnSync(process.execPath, [script.pathname], {
      cwd,
      env: { ...env, UGNAY_PENDING_URL: '1', UGNAY_BUILD_CHECK_ONLY: '1' },
      encoding: 'utf8'
    });
    assert.equal(conflicting.status, 1);
  } finally {
    rmSync(cwd, { recursive: true });
  }
});
