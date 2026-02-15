# Use official Node.js lightweight image
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy app source
COPY . .

# Expose port (Cloud Run sets PORT env var, typically 8080)
EXPOSE 8080

# Start command
CMD [ "npm", "start" ]
