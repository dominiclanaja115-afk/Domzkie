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

   | Variable         | Value                                              |
   | ---------------- | -------------------------------------------------- |
   | `PUBLIC_ORIGIN`  | `https://domzkie.onrender.com`                     |
   | `SECURE_COOKIES` | `1`                                                |
   | `DATA_DIR`       | Your persistent directory, e.g. `/var/lib/ugnayph` |
   | `NODE_ENV`       | `production`                                       |
   | `PORT`           | The port assigned by your host; default `3000`     |

4. Start command: `npm start`. An install command is not required for runtime; if
   your host requires one, use `npm ci --omit=dev`. Keep `DEMO` unset.
5. Enable the host's HTTPS endpoint/reverse proxy. Health-check path: `/healthz`.
   It should return `{"app":"ph.ugnay.app","status":"ok"}`.
6. Open your HTTPS address, sign up, and save the private recovery code. Try posting
   and messaging between two accounts. Restart the server and confirm data remains.
7. The supplied live URL, https://domzkie.onrender.com/, is now embedded in the final
   `UgnayPH.apk`. Users install it and proceed directly to Login/Signup.

Use encrypted disks/backups provided by your host. SQLite itself does not encrypt
its database file. See DEPLOYMENT.md for caching/security details and the existing
feature limits in README.md. Recovery uses a saved recovery code; email/SMS delivery
and background push notifications are not provided in this release.

## Historical pending-URL APK

`UgnayPH-Pending-URL.apk` installs on Android 8.0+. It has **no server address field**.
It shows a coming-soon page and the developer credit. Sign-in, posts and messaging
become available in a new APK after your live URL is embedded; the pending APK does
not discover a URL or activate remotely. Install the final build over this one using
the same signing key. Keep the private signing key out of the server upload.

## Origin-error server update

Deploy the updated `app/services/server.mjs` and restart the service. It accepts
Render's automatic external URL and normalizes a trailing slash in PUBLIC_ORIGIN.
The existing APK is compatible. For Git deployments use the repository's
`coderabbit/build-ugnayph-social-app/6a81962c` branch and Render's **Deploy latest
commit** action if automatic deploys are off. Keep the existing persistent data.
See DEPLOYMENT.md for the non-mutating verification command and optional CORS_ORIGINS.
