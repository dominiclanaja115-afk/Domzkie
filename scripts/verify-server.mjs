/* UgnayPH — Pinoy Social Media App
 * Created by: Dominic R. Lanaja
 * Copyright © 2026. All Rights Reserved. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
export function serverOrigin(value) {
  if (!value) throw Error('UGNAY_SERVER_URL must be the deployed public HTTPS origin.');
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw Error('Use an HTTPS origin without credentials, path, query, or fragment.');
  if (
    !/^[a-z0-9.-]+$/i.test(url.hostname) ||
    url.hostname === 'localhost' ||
    /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)
  )
    throw Error('Use the public server hostname.');
  return url.origin;
}
export async function verifyServer(origin, request = fetch) {
  for (const [path, valid] of [
    ['/healthz', (body) => body.app === 'ph.ugnay.app' && body.status === 'ok'],
    [
      '/api/config',
      (body) => body.app === 'ph.ugnay.app' && body.version === '1.1' && body.demo === false
    ]
  ]) {
    const response = await request(origin + path, {
      redirect: 'error',
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok || !valid(await response.json()))
      throw Error('Live UgnayPH server verification failed: ' + path);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const checkOnly = process.env.UGNAY_BUILD_CHECK_ONLY === '1';
  const origin = serverOrigin(
    checkOnly ? 'https://build-check.invalid' : process.env.UGNAY_SERVER_URL
  );
  if (!checkOnly) await verifyServer(origin);
  mkdirSync('build/gen/ph/ugnay', { recursive: true });
  writeFileSync(
    'build/gen/ph/ugnay/ServerConfig.java',
    '// UgnayPH — Created by: Dominic R. Lanaja. Copyright © 2026. All Rights Reserved.\n' +
      'package ph.ugnay; public final class ServerConfig { public static final String ORIGIN = ' +
      JSON.stringify(origin) +
      '; }\n'
  );
  console.log(
    checkOnly
      ? 'Compilation check only: this APK cannot connect to a community.'
      : 'Verified live backend: ' + origin
  );
}
