FROM node:18-alpine AS base

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat

WORKDIR /app
RUN npm install -g turbo@^2.3.4
COPY . .

RUN turbo prune @repo/web --docker

FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN npm install -g corepack@latest
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .

RUN pnpm turbo run build

RUN cp apps/web/node_modules/vscode-oniguruma/release/onig.wasm apps/web/.output/server/node_modules/vscode-oniguruma/release/onig.wasm

FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 tanstack
USER tanstack

# Set runtime env variables
ENV PORT=3000

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=installer --chown=tanstack:nodejs /app/apps/web/.output ./

CMD node server/index.mjs