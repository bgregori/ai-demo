# Build stage - Use Red Hat UBI Node.js
FROM registry.access.redhat.com/ubi9/nodejs-20:latest AS builder

USER 0
WORKDIR /opt/app-root/src

# Copy package files
COPY --chown=1001:0 package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY --chown=1001:0 . .

# Switch to non-root user for build
USER 1001

# Build the application
RUN npm run build

# Production stage - Use Red Hat UBI with nginx
FROM registry.access.redhat.com/ubi9/nginx-124:latest

# Replace main nginx.conf to remove default server block
COPY --chown=1001:0 nginx-main.conf /etc/nginx/nginx.conf

# Copy custom server config
COPY --chown=1001:0 nginx.conf /opt/app-root/etc/nginx.d/default.conf

# Copy built assets from builder stage to UBI nginx's default document root
COPY --from=builder --chown=1001:0 /opt/app-root/src/dist /opt/app-root/src

# Nginx runs on port 8080
EXPOSE 8080

# Run nginx (container already runs as non-root user 1001)
CMD ["nginx", "-g", "daemon off;"]
