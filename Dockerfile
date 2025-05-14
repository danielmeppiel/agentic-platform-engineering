# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:24-alpine 

# Install dependencies for Azure CLI
RUN apk --no-cache add \
    bash \
    ca-certificates \
    curl \
    gcc \
    libc-dev \
    libffi-dev \
    make \
    musl-dev \
    openssl-dev \
    python3 \
    python3-dev \
    py3-pip \
    jq

# Install Azure CLI in a virtual environment
RUN mkdir -p /opt/az && \
    python3 -m venv /opt/az/venv && \
    /opt/az/venv/bin/pip install --upgrade pip && \
    /opt/az/venv/bin/pip install azure-cli && \
    ln -s /opt/az/venv/bin/az /usr/local/bin/az

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config

# Set environment variables
ENV NODE_ENV=production
ENV PATH=$PATH:/usr/local/bin:/opt/az/venv/bin

# Create non-root user and ensure Azure CLI is accessible
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    mkdir -p /home/appuser/.azure && \
    chown -R appuser:appgroup /home/appuser/.azure && \
    chmod -R 755 /opt/az

USER appuser

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
