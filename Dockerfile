# Stage 1: Build & Development
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies (using cache)
COPY package.json package-lock.json ./
RUN npm install

# Copy source code
COPY . .

# Expose port (default Vite)
EXPOSE 5173

# Development command
CMD ["npm", "run", "dev", "--", "--host"]

# Stage 2: Production
FROM nginx:stable-alpine AS production

# Copy custom nginx config if you have one (optional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts from previous stage
# Note: This assumes you run 'npm run build' before or as part of the process.
# We modify the build step to ensure dist is created.
FROM base AS build
RUN npm run build

FROM nginx:stable-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 for Nginx
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
