FROM node:22-trixie-slim

# tectonic (self-contained LaTeX engine, fetches packages on demand). The prebuilt binary
# from the quick-install script needs glibc >= 2.38, which node:22-slim's Debian bookworm
# doesn't have (only 2.36) — hence trixie above.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && curl -fsSL https://drop-sh.fullyjustified.net | sh \
  && mv tectonic /usr/local/bin/tectonic \
  && apt-get purge -y curl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/backend/package.json apps/backend/

RUN pnpm install --frozen-lockfile --filter backend...

# playwright's chromium + OS deps, for the headless liveness-check fallback.
RUN pnpm --filter backend exec playwright install --with-deps chromium

COPY packages/shared-types packages/shared-types
COPY apps/backend apps/backend

WORKDIR /app/apps/backend
EXPOSE 3000
CMD ["pnpm", "start"]
