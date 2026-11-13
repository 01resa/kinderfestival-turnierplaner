# Kinderfestival Turnierplaner - Dockerfile
# Multi-Stage Build für optimierte Produktion

# ============================================================================
# STAGE 1: Dependencies & Build
# ============================================================================
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci --only=production && \
    npm cache clean --force

# ============================================================================
# STAGE 2: Builder
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./

# Copy source files
COPY . .

# Build the application
RUN npm run build

# ============================================================================
# STAGE 3: Production
# ============================================================================
FROM nginx:stable-alpine AS production

# Set environment variables
ENV NODE_ENV=production
ENV APP_NAME="Kinderfestival Turnierplaner"
ENV APP_PORT=8080

# Install dummy certificates for development (will be overridden by real certs)
RUN mkdir -p /etc/nginx/certs && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/nginx-selfsigned.key \
    -out /etc/nginx/certs/nginx-selfsigned.crt \
    -subj "/C=DE/ST=Bavaria/L=Munich/O=Kinderfestival/OU=IT/CN=kinderfestival-turnierplaner" 2>/dev/null || true

# Copy built files from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Copy static files
COPY static/ /usr/share/nginx/html/static/

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy health check script
COPY docker/healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Set user
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /usr/share/nginx/html

USER appuser

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
