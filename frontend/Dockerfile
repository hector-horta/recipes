# Frontend — Development image
FROM node:22-alpine AS base

# Install pnpm and su-exec
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate && \
    apk add --no-cache su-exec

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeapp -u 1001 -G nodejs

WORKDIR /app

# Copy pnpm workspace configuration and manifests
COPY pnpm-workspace.yaml* package.json ./
COPY packages ./packages/
COPY apps ./apps/

EXPOSE 5173

ENV CI=true
ENV PNPM_CONFIG_STORE_DIR=/tmp/.pnpm-store

# At container startup: install deps, fix permissions, then run as non-root
CMD ["sh", "-c", "mkdir -p /tmp/.pnpm-store && chmod -R 777 /tmp/.pnpm-store && pnpm install --store-dir /tmp/.pnpm-store --no-frozen-lockfile --force && chown -R nodeapp:nodejs /app/node_modules && exec su-exec nodeapp pnpm run dev --host"]

# ── Production build (optional) ─────────────────────────────────────────────
FROM base AS build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN pnpm install && pnpm run build

FROM nginx:stable-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
