# UgnayPH 1.1 — online release checklist

Created by: Dominic R. Lanaja  
Copyright © 2026. All Rights Reserved.

## Current state

The final APK embeds **https://domzkie.onrender.com/** from `android/server.json`.
It opens Login/Signup without any address-entry step and keeps the creator credit
visible. Version 1.1/code 4 replaces the earlier pending-URL preview. Live health and
configuration checks passed; the backend reports version 1.1 with demo mode off.

## One-time operator deployment (never an app-user step)

Use a Node 24 host or the supplied Dockerfile, with a **persistent volume** mounted at
`/var/lib/ugnayph`. Run exactly one instance with this SQLite database. Hosting must
provide HTTPS and an encrypted persistent disk and backups. The application hashes
passwords and enforces per-request access controls; disk encryption is a host setting,
not supplied by SQLite. Do not use an ephemeral filesystem or seed demo accounts.

Set `PUBLIC_ORIGIN` to the exact assigned HTTPS origin, `SECURE_COOKIES=1`, and
`DATA_DIR=/var/lib/ugnayph`. The process serves port 3000. Configure the host's reverse
proxy and health check `/healthz`. Ensure the volume is writable by UID 1000 (node).
Restrict direct HTTP access to the trusted reverse proxy. Use one production database;
keep the development SQLite file and synthetic demo accounts out of deployment.

1. Deploy the server and record its actual HTTPS URL.
2. Verify health, signup, login, posting, friends-only access, and messaging between
   two separate accounts/devices. Restart the server and verify data persisted.
3. Build with the committed live URL (or override `UGNAY_SERVER_URL` for a new host):

```bash
export JAVA_HOME=/path/to/jdk17
export ANDROID_HOME=/path/to/android-sdk
bash scripts/build-apk.sh
```

The script reads the committed server address and rejects missing/invalid origins
and checks `/healthz` and `/api/config` over TLS, refusing demo or incompatible servers.
These public checks are a build gate; they do not replace the two-account/persistence
checks above. No URL is requested from app users. Existing 1.0 server preferences are
ignored. Use the same signing key to install this version over 1.0.

`UGNAY_BUILD_CHECK_ONLY=1` compiles an explicitly named `UgnayPH-build-check.apk`
against an unresolvable `.invalid` origin for compiler verification only. It is not a
release, must not be distributed, and does not overwrite the last installable release.

## Render origins and CORS

Render's `RENDER_EXTERNAL_URL` is accepted automatically, including when TLS ends
at Render's proxy. For this deployment set `PUBLIC_ORIGIN=https://domzkie.onrender.com`
and keep `SECURE_COOKIES=1`. A trailing slash in an origin setting is normalized.
Do not use `*`. The Android app loads this same HTTPS origin and needs no APK update
for a server origin fix.

For additional trusted browser clients, set `CORS_ORIGINS` to a comma-separated
list of HTTP(S) origins. Allowed API requests receive the exact origin,
`Access-Control-Allow-Credentials: true`, and `Vary: Origin`. OPTIONS preflights
support GET/POST/PATCH/DELETE with Content-Type/If-None-Match headers. Unknown
origins, including `null`, are rejected. Proxy-provided host/protocol headers do
not grant origin access. With no configured origins, local development uses the
request's own host and socket protocol. Session cookies retain SameSite=Strict.

Deploy this repository's `coderabbit/build-ugnayph-social-app/6a81962c` branch in
Render. Enable automatic deploys or choose **Manual Deploy → Deploy latest commit**
after pulling the fix. Keep the existing persistent disk and DATA_DIR. Confirm the
deploy is Live, then reopen the existing APK and retry signup. Verify without
creating a real account:

```bash
curl -i https://domzkie.onrender.com/api/signup \
  -H 'Origin: https://domzkie.onrender.com' \
  -H 'Content-Type: application/json' --data '{}'
```

Expected: HTTP 400 with a missing-account-details message, not HTTP 403
`Origin not allowed`. This intentionally empty request creates no account.

## Local caching and security

- Recent feed, profile, connection, notification and conversation JSON is encrypted
  with AES-256-GCM in the app origin's IndexedDB storage. Its Web Crypto key is
  non-exportable and stored in the device's private origin storage. This is not Android
  hardware-backed encryption or end-to-end encryption; protect the device with a lock.
- Cache access starts only after fresh server authentication. Every cached response
  must be reauthorized by the server and match its ETag before it is reused, saving
  response bytes. Expired sessions and changed privacy controls never fall back to
  cached private data. There is no offline send queue or offline private-data access.
- Entries expire after 15 minutes, are bounded to 60 responses of at most 256 KB each,
  and are purged on writes/account transitions, logout attempts, and API authorization
  errors. If storage or encryption is unavailable, online functionality continues.
- Public UI assets use a short HTTP cache. Media remains online-only with `no-store`;
  uploaded photos/files are not persisted in the JSON cache. Explicit Android downloads
  are separate user-requested files.
- Developer credit remains visible in the Android toolbar and fixed web footer.

## Remaining release verification

The live HTTPS URL and final signed APK are available. Host disk encryption,
backups, restart persistence and communication across separate physical phones
remain operator checks. Health/configuration checks do not establish these.
All previous social features are retained; the existing moderation/push/email-delivery
limitations still apply. See TESTING.md for observed client verification.

## Historical preview before deployment

The developer can build an installable preview with `UGNAY_PENDING_URL=1 bash
scripts/build-apk.sh` (with JAVA_HOME and ANDROID_HOME configured). It produces
`build/UgnayPH-Pending-URL.apk`, a coming-soon page with persistent developer credit,
no address-entry form and no network requests. This is intentionally supplied for
installation before the URL exists. It requires a new final APK after the actual
server is deployed. Normal release builds still require live HTTPS verification.
See SERVER-UPLOAD.md for the server handoff.
