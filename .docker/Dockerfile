# Build stage
FROM node:23-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application for SSR (not static)
RUN npm run build

# Production stage
FROM node:23-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/.output ./.output

# Expose port
EXPOSE 3000

# Set environment variables for Nuxt server
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000
ENV NODE_ENV=production

# Start the Nuxt server
CMD ["node", ".output/server/index.mjs"]