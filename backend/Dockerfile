# Backend — Development image
# Works on Mac, Windows (WSL2), and Linux.
# node_modules are installed INSIDE the container at startup to avoid
# host-platform binary conflicts.
FROM node:20-alpine

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeapp -u 1001 -G nodejs

WORKDIR /app

# Copy only manifests so Docker caches this layer
COPY package.json ./

RUN mkdir -p /app/ingest_logs /app/public/recipes && \
    chown -R nodeapp:nodejs /app

USER nodeapp

EXPOSE 5001

# At container startup: always run npm install inside the container
CMD ["sh", "-c", "npm install && node server.js"]
