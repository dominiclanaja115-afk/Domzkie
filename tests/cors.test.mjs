/* UgnayPH — Pinoy Social Media App
 * Created by: Dominic R. Lanaja
 * Copyright © 2026. All Rights Reserved. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'ugnay-cors-'));
process.env.PUBLIC_ORIGIN = 'https://ugnay.example/';
process.env.RENDER_EXTERNAL_URL = 'https://domzkie.onrender.com/';
process.env.CORS_ORIGINS = 'https://client.example/, https://second.example:8443';
const { server, db } = await import('../app/services/server.mjs');
let base;
before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
  rmSync(process.env.DATA_DIR, { recursive: true });
});
test('Render HTTPS origin can sign up and use its session behind an HTTP proxy', async () => {
  const origin = 'https://domzkie.onrender.com';
  const response = await fetch(base + '/api/signup', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Origin Regression',
      identity: 'cors@example.test',
      password: 'RegressionPassword123!',
      birthdate: '1995-06-12',
      gender: 'Prefer not to say'
    })
  });
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  assert.match(response.headers.get('vary'), /Origin/);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  const me = await fetch(base + '/api/me', { headers: { Origin: origin, Cookie: cookie } });
  assert.equal((await me.json()).user.name, 'Origin Regression');
});
test('normalized configured origins and extra clients receive credentialed preflight', async () => {
  for (const origin of [
    'https://ugnay.example',
    'https://client.example',
    'https://second.example:8443'
  ]) {
    const response = await fetch(base + '/api/signup', {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, If-None-Match'
      }
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    assert.match(response.headers.get('access-control-allow-methods'), /PATCH/);
    assert.match(response.headers.get('access-control-allow-headers'), /content-type/);
    assert.equal(await response.text(), '');
  }
});
test('untrusted, opaque and spoofed proxy origins cannot read or mutate API data', async () => {
  for (const origin of [
    'https://attacker.example',
    'null',
    'http://domzkie.onrender.com',
    'https://domzkie.onrender.com.attacker.example'
  ]) {
    for (const method of ['GET', 'POST', 'OPTIONS']) {
      const response = await fetch(base + '/api/config', {
        method,
        headers: {
          Origin: origin,
          'X-Forwarded-Host': 'attacker.example',
          'X-Forwarded-Proto': 'https',
          'Access-Control-Request-Method': 'POST'
        }
      });
      assert.equal(response.status, 403);
      assert.equal(response.headers.get('access-control-allow-origin'), null);
    }
  }
});
test('preflight restricts methods and headers; trusted errors retain CORS headers', async () => {
  const headers = {
    Origin: 'https://domzkie.onrender.com',
    'Access-Control-Request-Method': 'PUT'
  };
  assert.equal((await fetch(base + '/api/signup', { method: 'OPTIONS', headers })).status, 405);
  headers['Access-Control-Request-Method'] = 'POST';
  headers['Access-Control-Request-Headers'] = 'X-Untrusted-Header';
  assert.equal((await fetch(base + '/api/signup', { method: 'OPTIONS', headers })).status, 403);
  const invalid = await fetch(base + '/api/signup', {
    method: 'POST',
    headers: { Origin: headers.Origin }
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.headers.get('access-control-allow-origin'), headers.Origin);
  assert.match((await invalid.json()).error, /valid email/);
});
