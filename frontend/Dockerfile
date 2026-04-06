# Frontend — Development image
# Works on Mac, Windows (WSL2), and Linux.
# node_modules are installed INSIDE the container at startup to avoid
# host-platform binary conflicts (e.g. @rollup/rollup-linux-arm64-musl).
FROM node:20-alpine AS base

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeapp -u 1001 -G nodejs && \
    apk add --no-cache su-exec

WORKDIR /app

# Copy only manifests first so Docker can cache the install layer
COPY package.json ./

EXPOSE 5173

# At container startup: install deps as root, fix permissions, then run as non-root
# so the correct platform binaries are used regardless of the host OS.
CMD ["sh", "-c", "npm install --include=optional && chown -R nodeapp:nodejs /app/node_modules && exec su-exec nodeapp npm run dev -- --host"]

# ── Production build (optional) ─────────────────────────────────────────────
FROM base AS build
USER root
RUN npm install --include=optional && npm run build

FROM nginx:stable-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
