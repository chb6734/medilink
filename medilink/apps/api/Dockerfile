FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@9.15.0

FROM base AS dependencies

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/

# Install dependencies
RUN pnpm install --frozen-lockfile

FROM base AS build

WORKDIR /app

# Copy dependencies
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=dependencies /app/packages/db/node_modules ./packages/db/node_modules

# Copy source files
COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Build the database package first
WORKDIR /app/packages/db
RUN pnpm prisma:generate
RUN pnpm build

# Verify Prisma engines are generated
RUN ls -la node_modules/.prisma/client/ || echo "Prisma client not in packages/db"

# Build the API
WORKDIR /app/apps/api
RUN pnpm build

FROM base AS runtime

WORKDIR /app

# Copy built files and dependencies
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/packages/db ./packages/db
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/package.json ./
COPY --from=build /app/packages/db/prisma ./packages/db/prisma

# Copy Prisma engines explicitly (critical for Alpine Linux)
# The .node files contain the query engine binaries
RUN mkdir -p ./packages/db/node_modules/.prisma/client
COPY --from=build /app/packages/db/node_modules/.prisma/client/ ./packages/db/node_modules/.prisma/client/

ENV NODE_ENV=production
ENV PORT=8787

EXPOSE 8787

# Run from /app directory with full path
CMD ["node", "apps/api/dist/src/main.js"]
