FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
# Install only runtime deps, ignore dev peer-dependency conflicts
RUN npm install --omit=dev --legacy-peer-deps

COPY src ./src
COPY seed.js ./seed.js

ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "src/app.js"]

