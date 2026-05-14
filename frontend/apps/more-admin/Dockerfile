# MORE Admin — Development image
FROM node:22-alpine AS base

# Install pnpm and su-exec
RUN npm install -g pnpm@9.15.4 && \
    apk add --no-cache su-exec

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeapp -u 1001 -G nodejs

# Set PNPM_HOME and ensure path is updated
ENV PNPM_HOME="/home/nodeapp/.pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Create necessary directories and ensure nodeapp ownership
RUN mkdir -p /home/nodeapp/.cache /home/nodeapp/.pnpm && \
    chown -R nodeapp:nodejs /home/nodeapp

WORKDIR /app

# Copy pnpm workspace configuration and manifests from the frontend root
COPY pnpm-workspace.yaml* package.json ./
COPY packages ./packages/
COPY apps/more-admin ./apps/more-admin/

EXPOSE 5174

ENV CI=true
ENV PNPM_CONFIG_STORE_DIR=/tmp/.pnpm-store

# At container startup: run dev for more-admin
CMD ["sh", "-c", "mkdir -p /tmp/.pnpm-store && chmod -R 777 /tmp/.pnpm-store && pnpm install --store-dir /tmp/.pnpm-store --no-frozen-lockfile && chown -R nodeapp:nodejs /app && cd apps/more-admin && exec su-exec nodeapp pnpm run dev --host"]

# ── Production build ─────────────────────────────────────────────
FROM base AS build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN pnpm install --no-frozen-lockfile && cd apps/more-admin && pnpm run build

FROM nginx:stable-alpine AS production
COPY --from=build /app/apps/more-admin/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
