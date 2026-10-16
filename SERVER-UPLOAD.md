# UgnayPH — Pinoy Social Media App

Created by: Dominic R. Lanaja  
Copyright © 2026. All Rights Reserved.

## Upload this server

The server archive includes the complete Node.js backend, web interface, database
initialization code, package lockfile and Dockerfile. No database or private keys are
included. It starts with an empty community. There are no runtime npm dependencies.

1. Extract `UgnayPH-Server.zip` and upload the contents of `UgnayPH-Server/` to your
   hosting service. Select **Node.js 24** or Docker.
2. Attach a **persistent disk**. Use a single server instance; SQLite data and uploads
   are stored in that disk. For Docker, mount it at `/var/lib/ugnayph`, writable by
   UID 1000. For a Node host, use its assigned persistent directory as `DATA_DIR`.
3. Set these environment variables in the hosting dashboard:

   | Variable         | Value                                               |
   | ---------------- | --------------------------------------------------- |
   | `PUBLIC_ORIGIN`  | Your actual HTTPS address, without a trailing slash |
   | `SECURE_COOKIES` | `1`                                                 |
   | `DATA_DIR`       | Your persistent directory, e.g. `/var/lib/ugnayph`  |
   | `NODE_ENV`       | `production`                                        |
   | `PORT`           | The port assigned by your host; default `3000`      |

4. Start command: `npm start`. An install command is not required for runtime; if
   your host requires one, use `npm ci --omit=dev`. Keep `DEMO` unset.
5. Enable the host's HTTPS endpoint/reverse proxy. Health-check path: `/healthz`.
   It should return `{"app":"ph.ugnay.app","status":"ok"}`.
6. Open your HTTPS address, sign up, and save the private recovery code. Try posting
   and messaging between two accounts. Restart the server and confirm data remains.
7. Send me the HTTPS URL. I will verify it and embed it in the final APK.

Use encrypted disks/backups provided by your host. SQLite itself does not encrypt
its database file. See DEPLOYMENT.md for caching/security details and the existing
feature limits in README.md. Recovery uses a saved recovery code; email/SMS delivery
and background push notifications are not provided in this release.

## Pending-URL APK

`UgnayPH-Pending-URL.apk` installs on Android 8.0+. It has **no server address field**.
It shows a coming-soon page and the developer credit. Sign-in, posts and messaging
become available in a new APK after your live URL is embedded; the pending APK does
not discover a URL or activate remotely. Install the final build over this one using
the same signing key. Keep the private signing key out of the server upload.
