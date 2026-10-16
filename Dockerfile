# UgnayPH — Pinoy Social Media App
# Created by: Dominic R. Lanaja
# Copyright © 2026. All Rights Reserved.
FROM node:24.14.1-bookworm-slim
ENV NODE_ENV=production PORT=3000 DATA_DIR=/var/lib/ugnayph SECURE_COOKIES=1
WORKDIR /srv/ugnayph
COPY --chown=node:node package.json ./
COPY --chown=node:node app ./app
RUN mkdir -p /var/lib/ugnayph && chown node:node /var/lib/ugnayph
USER node
EXPOSE 3000
VOLUME /var/lib/ugnayph
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "app/services/server.mjs"]
