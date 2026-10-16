# Verification — UgnayPH

Created by: Dominic R. Lanaja  
Copyright © 2026. All Rights Reserved.

## Render origin fix

- Reproduced HTTP 403 `Origin not allowed` on the public server using an empty
  signup request with Origin `https://domzkie.onrender.com` (no account created).
- `node --test tests/social.test.mjs tests/cors.test.mjs`: 17 tests passed. Coverage
  includes Render HTTPS signup/session through an HTTP socket, trailing-slash
  normalization, trusted preflights, untrusted/opaque/spoofed-origin rejection,
  error CORS headers and the existing social/privacy/conditional-cache workflows.
- `npm run check` and `git diff --check` passed. Client/cache/build code is unchanged;
  prior APK build and cache-specific tests remain applicable.
- Local results do not establish deployment status. After Render deploys the fixed
  server, use DEPLOYMENT.md's empty signup request to confirm the live origin check.

## Version 1.1 final live-URL build

- Live HTTPS `/healthz` and `/api/config` returned HTTP 200 with UgnayPH identity,
  version 1.1 and demo mode off. The final APK embeds `https://domzkie.onrender.com/`.
- Three deployment tests passed after adding the committed default URL. The earlier
  19-test pass for social workflows, encrypted cache isolation/tamper/expiry/limits,
  authenticated ETag reuse and deployment gates is reused for unchanged server/cache code.
- `npm run check` and `git diff --check` passed.
- The signed APK builds with JDK 17/SDK 35/build tools 35.0.0, version 1.1/code 4,
  minimum API 26 and target API 35. APK v2/v3 signatures verify and its signing
  certificate matches the previous builds, permitting installation as an update.
- Shared Chromium opened the actual live URL directly to Login, then Signup, with
  developer credit visible and no server-address field. No page errors were recorded.
  Mobile 390×844 login was visually inspected. No live accounts were created.
- API 26 emulator installation passed. Its default system image has no WebView
  provider, so opening the online client failed in that image. A Google APIs API 35
  image was installed, but software boot did not complete within the bounded
  approximately seven-minute attempt. It was stopped. Final APK network startup
  on Android remains unverified; the live web interface was verified separately.
- Earlier local Chromium checks passed: sign-in, persistent credit, non-exportable
  AES cache key, 304 reuse and empty local cache after logout. Earlier container
  health/signup and account persistence after restart passed on a persistent volume.
  These are local checks, not proof of the Render host's disk/backups configuration.

## Version 1.0 historical verification

- Node.js 24.14.1: real HTTP/SQLite integration suite passes (12 tests).
- Shared Chromium: demo sign-in, private post creation and deletion, language change, desktop feed and mobile layout without horizontal overflow, text chat send, and a resized photo upload (99 KB, displayed successfully).
- Android 8.0 software emulator: boot completed, `adb install -r build/UgnayPH.apk` returned Success, and `agent-device open ph.ugnay.app --foreground` confirmed the app and server-address field. The native setup screen was captured and inspected.
- APK compilation: JDK 17, SDK platform 35, build tools 35.0.0; APK v2/v3 signatures verify, minimum API 26.

## Not yet established

- Communication across separate physical phones and production restart persistence,
  encrypted disk and backup configuration on the user's host.
- Measured startup time or performance on an entry-level Android device.
- Physical-device microphone recording and attachment downloads.
- Background push notifications, production moderation and email/SMS verification
  are not implemented; see README.md for the existing feature limits.

## Historical pending-URL handoff

The earlier version 1.1/code 3 preview showed a native coming-soon page and no
server-address form. Its build/signature/install/runtime checks passed. The extracted
server archive passed startup, all web asset requests, signup and messaging between
two synthetic accounts. The final `UgnayPH.apk` replaces that waiting preview.
Read DEPLOYMENT.md for hosting and caching details.
