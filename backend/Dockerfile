FROM node:20-alpine

# Create a non-root user for security
# Running as non-root prevents privilege escalation attacks
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeapp -u 1001 -G nodejs

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Change ownership of app directory to non-root user
# This allows the app to write to necessary directories
RUN chown -R nodeapp:nodejs /app

# Switch to non-root user
USER nodeapp

EXPOSE 5000

# Start server
CMD ["node", "server.js"]
