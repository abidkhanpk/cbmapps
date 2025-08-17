FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fmeca

# Copy built application
COPY --from=builder --chown=fmeca:nodejs /app/dist ./dist
COPY --from=builder --chown=fmeca:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=fmeca:nodejs /app/package.json ./package.json
COPY --from=builder --chown=fmeca:nodejs /app/prisma ./prisma
COPY --from=builder --chown=fmeca:nodejs /app/views ./views
COPY --from=builder --chown=fmeca:nodejs /app/public ./public

# Create storage directory
RUN mkdir -p /app/storage && chown -R fmeca:nodejs /app/storage

USER fmeca

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "start"]
