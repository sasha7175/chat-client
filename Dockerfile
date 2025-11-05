# Multi-stage build for smaller image size
FROM node:18-alpine AS base

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose the port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]

