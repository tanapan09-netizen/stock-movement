# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Provide a placeholder DB URL so Next.js static generation doesn't fail
# during build. The real DATABASE_URL is injected at runtime by docker-compose.
ENV DATABASE_URL="mysql://build:build@localhost:3306/build_placeholder"

# LINE Login credentials (needed at build time for NextAuth)
ARG AUTH_LINE_ID=2009265965
ARG AUTH_LINE_SECRET=2af2043594a8653da078b0fd7a819155
ENV AUTH_LINE_ID=${AUTH_LINE_ID}
ENV AUTH_LINE_SECRET=${AUTH_LINE_SECRET}

# LINE LIFF ID (needed at build time for Next.js NEXT_PUBLIC_*)
ARG NEXT_PUBLIC_LINE_LIFF_ID="2008611623-Buwh8JEn"
ENV NEXT_PUBLIC_LINE_LIFF_ID=${NEXT_PUBLIC_LINE_LIFF_ID}

# Build the application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install OpenSSL for Prisma and mariadb-client/connector for backup/restore
RUN apk add --no-cache openssl mariadb-client mariadb-connector-c

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create uploads and backups directory
RUN mkdir -p ./public/uploads ./backups && chown -R nextjs:nodejs ./public/uploads ./backups

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
