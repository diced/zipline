# Use the Prisma binaries image as the first stage
FROM ghcr.io/diced/prisma-binaries:4.10.x as prisma

# Use Alpine Linux as the second stage
FROM node:18-alpine3.16 as base

# Set the working directory
WORKDIR /zipline

# Copy the necessary files from the project
COPY prisma ./prisma

COPY .yarn ./.yarn
COPY package*.json ./
COPY yarn*.lock ./
COPY .yarnrc.yml ./

# Copy the prisma binaries from prisma stage
COPY --from=prisma /prisma-engines /prisma-engines
ENV PRISMA_QUERY_ENGINE_BINARY=/prisma-engines/query-engine \
  PRISMA_MIGRATION_ENGINE_BINARY=/prisma-engines/migration-engine \
  PRISMA_INTROSPECTION_ENGINE_BINARY=/prisma-engines/introspection-engine \
  PRISMA_FMT_BINARY=/prisma-engines/prisma-fmt \
  PRISMA_CLI_QUERY_ENGINE_TYPE=binary \
  PRISMA_CLIENT_ENGINE_TYPE=binary \
  ZIPLINE_DOCKER_BUILD=true \
  NEXT_TELEMETRY_DISABLED=1

# Install production dependencies then temporarily save
RUN yarn workspaces focus --production --all
RUN cp -RL node_modules /tmp/node_modules

# Install the dependencies
RUN yarn install --immutable

FROM base as builder

COPY src ./src
COPY next.config.js ./next.config.js
COPY tsup.config.ts ./tsup.config.ts
COPY tsconfig.json ./tsconfig.json
COPY mimes.json ./mimes.json
COPY public ./public

# Run the build
RUN yarn build

# Use Alpine Linux as the final image
FROM base

# Install the necessary packages
RUN apk add --no-cache perl procps tini

COPY --from=builder /prisma-engines /prisma-engines
ENV PRISMA_QUERY_ENGINE_BINARY=/prisma-engines/query-engine \
  PRISMA_MIGRATION_ENGINE_BINARY=/prisma-engines/migration-engine \
  PRISMA_INTROSPECTION_ENGINE_BINARY=/prisma-engines/introspection-engine \
  PRISMA_FMT_BINARY=/prisma-engines/prisma-fmt \
  PRISMA_CLI_QUERY_ENGINE_TYPE=binary \
  PRISMA_CLIENT_ENGINE_TYPE=binary \
  NEXT_TELEMETRY_DISABLED=1

# Copy only the necessary files from the previous stage
COPY --from=builder /zipline/dist ./dist
COPY --from=builder /zipline/.next ./.next
COPY --from=builder /zipline/package.json ./package.json

COPY --from=builder /zipline/node_modules ./node_modules

# Copy Startup Script
COPY docker-entrypoint.sh /zipline

# Make Startup Script Executable
RUN chmod a+x /zipline/docker-entrypoint.sh && rm -rf /zipline/src

# Set the entrypoint to the startup script
ENTRYPOINT ["tini", "--", "/zipline/docker-entrypoint.sh"]