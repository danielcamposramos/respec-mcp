FROM node:24-bookworm-slim

# Chromium runtime libraries required by Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      fonts-liberation \
      libasound2 \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libcups2 \
      libdbus-1-3 \
      libdrm2 \
      libgbm1 \
      libglib2.0-0 \
      libgtk-3-0 \
      libnspr4 \
      libnss3 \
      libu2f-udev \
      libx11-6 \
      libx11-xcb1 \
      libxcb1 \
      libxcomposite1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxkbcommon0 \
      libxrandr2 \
      xdg-utils \
  && rm -rf /var/lib/apt/lists/*

ARG APP_UID=10001
ARG APP_GID=10001
RUN groupadd --system --gid ${APP_GID} respec \
  && useradd --system --uid ${APP_UID} --gid ${APP_GID} \
             --create-home --home-dir /home/respec --shell /usr/sbin/nologin respec

ENV PUPPETEER_CACHE_DIR=/home/respec/.cache/puppeteer
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false

WORKDIR /app
COPY --chown=respec:respec package.json pnpm-lock.yaml* package-lock.json* ./
RUN corepack enable \
  && if [ -f pnpm-lock.yaml ]; then \
        pnpm install --prod --frozen-lockfile; \
     elif [ -f package-lock.json ]; then \
        npm ci --omit=dev; \
     else \
        npm install --omit=dev; \
     fi

COPY --chown=respec:respec . .

# Bind-mount the spec repo at /workspace when running:
#   docker run --rm -i -v /path/to/spec-repo:/workspace respec-mcp:local
USER respec
ENTRYPOINT ["node", "bin/respec-mcp.js", "--repo-root", "/workspace", "--disable-sandbox"]
