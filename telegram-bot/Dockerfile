FROM node:20-alpine

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeapp -u 1001 -G nodejs

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

RUN chown -R nodeapp:nodejs /app

USER nodeapp

CMD ["node", "bot.js"]
