# ── Stage 1: Build Shopify React frontend ─────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /usr/src/app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Backend runtime image ────────────────────────────────────────
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
# Install only runtime deps, ignore dev peer-dependency conflicts
RUN npm install --omit=dev --legacy-peer-deps

COPY src ./src
COPY seed.js ./seed.js

# Copy built frontend static files into the public directory
# Express serves these at /shopify/* (see src/app.js)
COPY --from=frontend-builder /usr/src/app/frontend/../public/shopify ./public/shopify

ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "src/app.js"]
