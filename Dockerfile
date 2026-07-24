# ---- 1. Dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --legacy-peer-deps

# ---- 2. Build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY . .
# GEMINI_API_KEY is only needed at runtime, not at build time.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- 3. Runtime ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Next.js "standalone" output (see next.config.js: output: "standalone")
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# GEMINI_API_KEY must be supplied at runtime via the platform's
# environment/secrets configuration (AWS App Runner, Render, etc.) — never baked into the image.
CMD ["node", "server.js"]
