# UgnayPH — Pinoy Social Media App

**Created by: Dominic R. Lanaja**  
**Copyright © 2026. All Rights Reserved.**

Version 1.0 — Your Filipino Home Online. For Every Filipino, Everywhere.

A lightweight social application with an original Filipino visual identity, a Node.js/SQLite server, a responsive browser client, and an Android 8.0+ HTTPS client. No Facebook code, assets, or icon library is used.

## Delivery status

The source and signed development APK are built. The backend integration suite passes. **A public server is not deployed or bundled into the APK.** On first launch, enter the HTTPS origin of your hosted UgnayPH server. The development preview uses synthetic demo accounts.

The APK is development-signed and intended for installation and evaluation. Keep the signing key securely to produce compatible updates; it is deliberately excluded from this source archive. Before a public launch, establish production hosting, backups, moderation, identity verification and operational support. No claim is made of a measured sub-two-second startup on entry-level phones.

## Start the web app / server

Requirements: Node.js **24.14.1 or newer in the 24.x series**. The server uses built-in `node:sqlite`, `node:http`, and `node:crypto`; there are no runtime npm dependencies.

```bash
npm ci
npm start
```

Open `http://localhost:3000`. Create an account. **Save the recovery code** displayed after signup; it is required for password recovery. All account and social data persist in `data/ugnay.db`.

Optional synthetic development community, on an **empty** database only:

```bash
npm run demo
DEMO=1 npm start
```

Demo credentials: `maria@ugnay.example` / `UgnayDemo2026!`. All seeded accounts use that password and fictional identities. Do not seed a public deployment. `DEMO=1` only shows the demo shortcut; it does not create accounts or bypass authentication.

### Public hosting

1. Use a Linux server with Node 24, persistent storage, and a domain you control.
2. Copy the source. Run the process under a service manager, as a dedicated unprivileged user.
3. Put an HTTPS reverse proxy in front of port 3000. Restrict direct access to port 3000 at your firewall.
4. Set the exact external origin (without a trailing slash) and secure cookies:

```bash
PUBLIC_ORIGIN=https://community.example.org SECURE_COOKIES=1 DATA_DIR=/var/lib/ugnayph PORT=3000 npm start
```

Example Caddy configuration (replace the example domain):

```caddyfile
community.example.org {
    reverse_proxy 127.0.0.1:3000
}
```

Caddy manages HTTPS certificates. Ensure its request body allowance is at least 12 MB. Do not put the SQLite directory inside a web-served path. Back up the database using SQLite's backup API or stop the server before copying the complete data directory; a running WAL-mode database must not be backed up by copying only its main `.db` file. Encrypt backups and define retention/deletion policies.

The server does not trust forwarded IP headers. Its basic request rate limit therefore groups requests behind a proxy by socket address; tune this and add proxy-level rate controls before scaling beyond a small community. SQLite and synchronous password hashing suit an initial small deployment, not a large public network.

## Install UgnayPH.apk

1. Copy `UgnayPH.apk` to a phone running **Android 8.0 (API 26) or later**.
2. Open the file and allow “Install unknown apps” for the file manager/browser if Android asks. Install, then turn that permission off again.
3. Launch UgnayPH. Enter your server's HTTPS address, for example `https://community.example.org`.
4. Sign up or sign in. Allow microphone access only if you want to record voice messages.

Keep Android System WebView updated. No broad storage permission is requested: attachments use the system picker. Android downloads go to the app's external downloads directory, with a download notification. Use the app's top-right menu to reload or switch servers. Switching clears login cookies. A server must use a valid TLS certificate; HTTP and invalid certificates are not bypassed.

## Build the APK

Requirements: JDK 17, Android SDK platform 35, build tools 35.0.0, `zip`. The native shell has no Gradle or third-party Android dependencies.

```bash
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME=/path/to/android-sdk
bash scripts/build-apk.sh
```

Output: `build/UgnayPH.apk`, package `ph.ugnay.app`, version name `1.0`, version code `1`, min SDK `26`, target SDK `35`. The script aligns the APK and verifies its v2/v3 signature.

By default, a development key is created at `$HOME/.ugnayph/signing.jks`, alias `ugnayph`, using a development password. For your own release, create a private key and set `UGNAY_KEYSTORE` and `UGNAY_STOREPASS` through a secure local environment. Do not commit or distribute private keys. The delivered APK's task-local development key is not in the source archive; a locally rebuilt APK with a different key cannot install over it.

### Update the app

- Back up server data before updating the backend. Replace source, retain `DATA_DIR`, restart the process, and test login/feed/chat. Version 1.0 initializes its schema automatically; future schema changes need explicit migrations.
- The Android client loads UI updates from your server on reload.
- For a native APK update, increment `android:versionCode` and `android:versionName` in `android/AndroidManifest.xml`, build with **the same signing key**, and install over the existing app. If keys differ, Android requires uninstalling first; server data remains, but local sign-in state is removed.

## Features and practical limits

| Area          | Available in this version                                                                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts      | Name, email/phone identifier, birthdate, gender, salted scrypt password hashing, HttpOnly sessions, remember me, logout, recovery-code password reset                       |
| Profile       | Profile/cover uploads, bio, hometown, work, school, profile feed, edit form                                                                                                 |
| Feed          | Text/photo/video, feeling/location, Public/Friends/Only me audiences, cursor pagination, Discover and friends/following feeds, Bayan/Pamilya/Kultura spaces                 |
| Interaction   | Like/Agree/Happy/Sad/Grateful/Proud, comments, shares that retain original access controls, delete own posts                                                                |
| Kapwa         | Name search, suggestions, request/accept/decline/cancel, friends list, remove connection, follow/unfollow                                                                   |
| Messages      | One-to-one text/photos/audio/video/PDF/text files, microphone recording up to 60 seconds, unread count, read status, approximate online/last seen, older-message pagination |
| Notifications | Reactions/comments/shares, connection requests/acceptance, moment reactions, read/clear controls                                                                            |
| Moments       | Photo/video, friends-only visibility, view/react, server-enforced 24-hour expiry                                                                                            |
| Preferences   | English/Filipino core interface, data saver, default post audience, friends-only messaging, password change, deactivate/reactivate, delete account                          |
| Identity      | Original flag-inspired colors, original SVG icons/mark, required developer credit in About, footer and source headers                                                       |

Operational limits:

- This is an initial self-hosted release, **not full production parity with Facebook Lite**. It has no moderation/report/block workflow, push delivery while closed, end-to-end encryption, email/SMS delivery, or verified email/phone ownership.
- Recovery uses the private code rather than an emailed/SMS link. Losing both password and recovery code requires contacting the server operator; there is no insecure reset bypass.
- Core navigation/forms are bilingual. User-generated posts remain in their original language; some help, validation and Android setup text remains English.
- Chat and badges refresh every 15 seconds while visible. The app must be open and online; this version has no offline posting queue.
- Photo uploads are resized to at most 960 px / JPEG quality 65% in Data Saver, or 1600 px / 85% otherwise. Images load lazily; videos never autoplay. Data Saver does not recompress previously stored attachments. Video/file uploads are limited to 8 MB, and accounts have a 100 MB attachment allowance. Orphaned uploads count toward this allowance until account deletion; automated media reclamation is not yet provided.
- Stories disappear from all authorized endpoints after 24 hours, and their rows are cleaned periodically. Associated attachment bytes may remain until account deletion and are not visible to other users after expiry unless also attached to another accessible post or message.
- People results are capped at 50, notifications at 100, and comments at the latest 100 per post. There are no large-community search/indexing guarantees.
- Deactivation hides profile/posts; logging back in reactivates. Deletion cascades account content in the live database. Operator backups require separate retention handling.
- APK build/signature checks are distinct from installation/runtime verification; see `TESTING.md` for actual validation results.

## Source structure

```text
UgnayPH/
├── README.md
├── TESTING.md
├── LICENSE
├── package.json / package-lock.json / mise.toml
├── app/
│   ├── App.js                  # Navigation, forms, uploads, polling
│   ├── index.html
│   ├── screens/screens.js      # Page renderers
│   ├── components/ui.js        # Shared controls, icons, escaping
│   ├── services/server.mjs     # HTTP API, authorization, SQLite
│   ├── services/i18n.js        # English/Filipino strings
│   └── assets/                 # Styles, original icon, demo photo
├── android/
│   ├── AndroidManifest.xml
│   ├── src/ph/ugnay/MainActivity.java
│   └── res/drawable/ic_launcher.xml
├── scripts/
│   ├── build-apk.sh
│   └── seed.mjs
└── tests/social.test.mjs
```

## Validation

```bash
npm test
npm run check
```

The integration tests start a real HTTP server against an isolated temporary SQLite database. They cover auth/session recovery, private/friends-only data access, reactions/shares, file ownership, message privacy/read state, story expiry, friendship removal, account lifecycle/deletion and cross-origin protection.

## Asset attribution

The UgnayPH logo, line icons, and CSS landscape are original code assets. The optional demo photograph is downloaded from [Unsplash](https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86) under the [Unsplash license](https://unsplash.com/license); it is used only in synthetic fixtures. User uploads are not included in the source archive.
