# Stage 1: Build & Development
FROM node:20-alpine AS base

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeapp -u 1001 -G nodejs

WORKDIR /app

# Install dependencies (using cache)
COPY package.json package-lock.json* ./
RUN npm install --include=optional

# Copy source code
COPY . .

# Change ownership to non-root user
RUN chown -R nodeapp:nodejs /app

# Switch to non-root user
USER nodeapp

# Expose port (default Vite)
EXPOSE 5173

# Development command
CMD ["npm", "run", "dev", "--", "--host"]

# Stage 2: Production build
FROM base AS build
RUN npm run build

# Stage 3: Production nginx
FROM nginx:stable-alpine AS production

# Create non-root user for nginx
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx

COPY --from=build /app/dist /usr/share/nginx/html

# Set correct permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Run as non-root user
USER nginx

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
