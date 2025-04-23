FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Set environment variables
ENV NODE_ENV=development
ENV PORT=3001
ENV NEXT_TELEMETRY_DISABLED=1

# Expose ports
EXPOSE 3000
EXPOSE 3001

# Add the entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Start the application with our custom script
CMD ["/app/docker-entrypoint.sh"]
