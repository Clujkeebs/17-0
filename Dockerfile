# syntax=docker/dockerfile:1.7
# Multi-stage build. Targets: web (default), worker, cron.
ARG NODE_VERSION=22-bookworm-slim

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_ADSENSE_CLIENT=""
ENV NEXT_PUBLIC_ADSENSE_CLIENT=$NEXT_PUBLIC_ADSENSE_CLIENT
RUN npm run build && npm run build:worker

# Shared slim runtime
FROM node:${NODE_VERSION} AS base-runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app app

# ---- web: Next.js standalone server ----
FROM base-runtime AS web
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
# Share-card fonts are read from node_modules at runtime; standalone tracing does not include .woff files.
COPY --from=builder --chown=app:app /app/node_modules/@fontsource/inter/files ./node_modules/@fontsource/inter/files
COPY --from=builder --chown=app:app /app/node_modules/@fontsource/jetbrains-mono/files ./node_modules/@fontsource/jetbrains-mono/files
COPY --from=builder --chown=app:app /app/drizzle ./drizzle
COPY --from=builder --chown=app:app /app/dist/migrate.mjs ./migrate.mjs
RUN mkdir -p .next/cache && chown -R app:app .next/cache
USER app
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "node migrate.mjs && node server.js"]

# ---- worker: BullMQ + Playwright Chromium ----
FROM base-runtime AS worker
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY --from=deps /app/node_modules/playwright-core ./node_modules/playwright-core
RUN node node_modules/playwright-core/cli.js install --with-deps chromium-headless-shell \
  && rm -rf /var/lib/apt/lists/* /tmp/*
COPY --from=builder --chown=app:app /app/dist/worker.mjs ./worker.mjs
RUN mkdir -p /app/snapshots && chown app:app /app/snapshots
ENV SNAPSHOT_DIR=/app/snapshots
USER app
CMD ["node", "worker.mjs"]

# ---- cron: tiny dispatcher + nightly pg_dump ----
FROM base-runtime AS cron
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/dist/cron.mjs ./cron.mjs
COPY --from=builder /app/dist/backup.mjs ./backup.mjs
USER app
CMD ["node", "cron.mjs"]

FROM web
