# Multi-stage Dockerfile for consumer (Next.js app in Turbo monorepo)
FROM node:20-alpine AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune consumer --docker

# Re-build the source code only when needed
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# First copy pruned package JSONs & lockfile to leverage Docker layer caching
COPY --from=pruner /app/out/json/ .
RUN npm ci

# Copy full pruned source and turbo configuration
COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json

# Build arguments for environment variables needed at build time
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

ENV NEXT_TELEMETRY_DISABLED=1

RUN npx turbo build --filter=consumer...

# Production image, copy standalone build and runner requirements
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static assets and public directory
COPY --from=builder /app/apps/consumer/public ./apps/consumer/public

# Copy standalone server output
COPY --from=builder --chown=nextjs:nodejs /app/apps/consumer/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/consumer/.next/static ./apps/consumer/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/consumer/server.js"]
