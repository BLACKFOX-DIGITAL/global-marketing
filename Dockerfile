FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Pass a dummy database url so next build succeeds without a real db
ENV DATABASE_URL="file:/app/data/prod.db"
RUN npx prisma generate
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
RUN apk add --no-cache openssl bash
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/data/prod.db"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Expose Next.js port
EXPOSE 3000
ENV PORT=3000

# Push the database and start the Next.js server
CMD ["sh", "-c", "npx prisma db push && npm start"]
