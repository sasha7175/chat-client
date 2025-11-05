# Multi-stage build for smaller image size
FROM node:18-alpine AS base

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Use npm ci if package-lock.json exists, otherwise use npm install
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm install --omit=dev; \
    fi

# Copy application files
COPY . .

# Expose the port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]

