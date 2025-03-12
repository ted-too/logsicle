# apps/web/Dockerfile
FROM node:20-alpine AS base

# Install corepack and pnpm
RUN npm install -g corepack@latest
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Set working directory
WORKDIR /app

# CACHE LAYER: Copy only files needed for dependency installation
FROM base AS dependencies
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY packages ./packages
COPY apps/web/package.json ./apps/web/

# Use mount cache for pnpm store
RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

# BUILD LAYER: Use cached dependencies to build the app
FROM dependencies AS build
COPY apps/web ./apps/web

# Set build-time environment variables
ARG PUBLIC_API_URL
ENV PUBLIC_API_URL=${PUBLIC_API_URL}
ENV NODE_ENV=production

RUN pnpm --filter web build

# PRODUCTION LAYER: Create the final image with just the built files
FROM nginx:alpine AS deploy
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]