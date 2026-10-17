# ==============================================================================
# HimalSanket Frontend Dashboard - Google Cloud Run Multi-Stage Container
# ==============================================================================

# ---- Stage 1: Build Frontend Assets & Server Bundle ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy project source
COPY . .

# Build arguments for Vite client-side environment variables
ARG VITE_RISK_ENGINE_API=""
ARG VITE_GOOGLE_MAPS_API_KEY=""
ARG VITE_GOOGLE_GEOCODING_API_KEY=""
ARG VITE_GOOGLE_ELEVATION_API_KEY=""

ENV VITE_RISK_ENGINE_API=$VITE_RISK_ENGINE_API \
    VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY \
    VITE_GOOGLE_GEOCODING_API_KEY=$VITE_GOOGLE_GEOCODING_API_KEY \
    VITE_GOOGLE_ELEVATION_API_KEY=$VITE_GOOGLE_ELEVATION_API_KEY

# Run Vite production build + esbuild server bundle
RUN npm run build

# ---- Stage 2: Minimal Production Runtime ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Non-root user for Cloud Run security compliance
USER node

EXPOSE 8080

# Cloud Run injects $PORT at runtime; node dist/server.cjs listens on process.env.PORT
CMD ["node", "dist/server.cjs"]
