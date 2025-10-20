# Use official Node LTS on Alpine Linux for a small image
FROM node:20-alpine

# Create and set the app directory inside the container
WORKDIR /usr/src/app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy the rest of your application source code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# The command to start the app when the container launches
CMD ["node", "index.js"]