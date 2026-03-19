# Stage 1: Build & Development
FROM node:20-alpine AS base

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

# Stage 2: Production (for reference)
FROM base AS build
RUN npm run build

FROM nginx:stable-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
