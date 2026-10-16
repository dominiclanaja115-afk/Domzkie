# Verification — UgnayPH 1.0

Created by: Dominic R. Lanaja  
Copyright © 2026. All Rights Reserved.

## Verified in the build sandbox

- Node.js 24.14.1: real HTTP/SQLite integration suite passes (12 tests).
- Shared Chromium: demo sign-in, private post creation and deletion, language change, desktop feed and mobile layout without horizontal overflow, text chat send, and a resized photo upload (99 KB, displayed successfully).
- Android 8.0 software emulator: boot completed, `adb install -r build/UgnayPH.apk` returned Success, and `agent-device open ph.ugnay.app --foreground` confirmed the app and server-address field. The native setup screen was captured and inspected.
- APK compilation: JDK 17, SDK platform 35, build tools 35.0.0; APK v2/v3 signatures verify, minimum API 26.

## Not yet established

- A hosted public HTTPS server, APK-to-server end-to-end flow, and operation across separate physical phones.
- Measured startup time or performance on an entry-level Android device.
- Background push notifications, production moderation and email/SMS verification are not implemented.

The APK is a signed development build. Read README.md for hosting, installation, update signing, and functional limits.
