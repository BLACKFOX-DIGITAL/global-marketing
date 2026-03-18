FROM node:18-alpine

# Install necessary libraries for Prisma Engine on Alpine Linux
RUN apk add --no-cache openssl libc6-compat

# Set working directory
WORKDIR /app

# Copy package files to install dependencies
COPY package.json package-lock.json ./

# Install dependencies using clean install
RUN npm ci

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the Next.js app for production
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Expose the default Next.js port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
