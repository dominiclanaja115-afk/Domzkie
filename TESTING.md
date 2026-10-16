# Verification — UgnayPH

Created by: Dominic R. Lanaja  
Copyright © 2026. All Rights Reserved.

## Version 1.1 online update

- `npm test`: 19 tests passed, including all original social workflows, encrypted cache isolation/tamper/expiry/limits, authenticated ETag reuse, and live-server build gates.
- `npm run check` and `git diff --check`: passed.
- Chromium: sign-in, persistent developer credit, AES cache key marked non-exportable, repeated feed requests returned 304, and logout left zero local cache records.
- Android source compiles with API 26 minimum and valid APK signatures in compilation-only mode. This uses a deliberately invalid host and is not a releasable APK.
- Missing deployment URL is rejected by the release build gate. No actual HTTPS backend has been deployed.
- Container image builds; container health/signup passed and the account remained available after a restart using a persistent volume. The first smoke attempt ran before readiness and failed; retrying after a bounded health wait passed. Public hosting, final URL embedding and the updated APK network/device flows remain blocked pending hosting access.

## Version 1.0 historical verification

- Node.js 24.14.1: real HTTP/SQLite integration suite passes (12 tests).
- Shared Chromium: demo sign-in, private post creation and deletion, language change, desktop feed and mobile layout without horizontal overflow, text chat send, and a resized photo upload (99 KB, displayed successfully).
- Android 8.0 software emulator: boot completed, `adb install -r build/UgnayPH.apk` returned Success, and `agent-device open ph.ugnay.app --foreground` confirmed the app and server-address field. The native setup screen was captured and inspected.
- APK compilation: JDK 17, SDK platform 35, build tools 35.0.0; APK v2/v3 signatures verify, minimum API 26.

## Not yet established

- A hosted public HTTPS server, APK-to-server end-to-end flow, and operation across separate physical phones.
- Measured startup time or performance on an entry-level Android device.
- Background push notifications, production moderation and email/SMS verification are not implemented.

The existing 1.0 APK is unchanged. An installable version 1.1 pending-URL preview
(code 3) is now supplied; it shows a native coming-soon page. The signed APK build
and deployment-mode tests passed. The complete extracted server upload was smoke
tested for startup, health, all web assets, two-account signup and messaging.
The final connected version still requires the user’s live HTTPS URL. Read DEPLOYMENT.md for hosting, local caching, and remaining release gates.

## Pending-URL handoff

The pending-URL build mode has three passing deployment tests (origin checks,
live-backend gate, and pending configuration/release-mode separation). The signed
APK uses the same certificate as version 1.0, supports Android 8.0+, and contains
no endpoint in pending mode. Server code is unchanged from the earlier 19-test
validation; an extracted upload archive additionally passed a fresh process
startup, all web asset requests, signup and message delivery between two accounts.
