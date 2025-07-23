FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs

# Expose ports
EXPOSE 3003 53235/udp

# Start the application
CMD ["npm", "start"]
