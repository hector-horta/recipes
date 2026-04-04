FROM node:20-alpine

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeapp -u 1001 -G nodejs

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

RUN mkdir -p /app/ingest_logs /app/public/recipes && \
    chown -R nodeapp:nodejs /app

USER nodeapp

EXPOSE 5000

CMD ["node", "server.js"]
