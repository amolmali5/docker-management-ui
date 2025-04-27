# ---- Base Stage (build dependencies only once) ----
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies only from package.json
COPY package*.json ./
RUN npm ci --ignore-scripts

# ---- Dependencies Stage (optional: for dev dependencies) ----
FROM base AS dev
COPY . .
ENV NODE_ENV=development
RUN npm run build || true  # avoid failure during dev if build errors
EXPOSE 3000 3001
CMD ["npm", "run", "app"]

# ---- Production Stage ----
FROM base AS prod

# Copy only necessary files
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV NEXT_TELEMETRY_DISABLED=1

# Build the app
RUN npm run build

# Remove dev dependencies (optional)
RUN npm prune --omit=dev

# Add and set permissions for entrypoint
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose app ports
EXPOSE 3000 3001

# Run the app
CMD ["/app/docker-entrypoint.sh"]
