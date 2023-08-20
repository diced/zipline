# FROM ghcr.io/diced/prisma-binaries:4.10.x as prisma-binaries

FROM node:18-alpine3.16 as base

WORKDIR /zipline

# Prisma binaries
# COPY --from=prisma /prisma-engines /prisma-engines
# ENV PRISMA_QUERY_ENGINE_BINARY=/prisma-engines/query-engine \
#   PRISMA_MIGRATION_ENGINE_BINARY=/prisma-engines/migration-engine \
#   PRISMA_INTROSPECTION_ENGINE_BINARY=/prisma-engines/introspection-engine \
#   PRISMA_FMT_BINARY=/prisma-engines/prisma-fmt \
#   PRISMA_CLI_QUERY_ENGINE_TYPE=binary \
#   PRISMA_CLIENT_ENGINE_TYPE=binary \
#   ZIPLINE_BUILD=true \
#   NEXT_TELEMETRY_DISABLED=1 \
#   NODE_ENV=production

ENV NEXT_TELEMETRY_DISABLED=1 \
  NODE_ENV=production

# Copy the necessary files from the project
COPY prisma ./prisma
COPY .yarn ./.yarn
COPY package.json ./
COPY yarn.lock ./
COPY .yarnrc.yml ./

# Install the dependencies
RUN yarn install --immutable

FROM base as builder

COPY src ./src
COPY next.config.js ./next.config.js
COPY tsup.config.ts ./tsup.config.ts
COPY tsconfig.json ./tsconfig.json
COPY mimes.json ./mimes.json
COPY code.json ./code.json
COPY themes ./themes

# Run the build
RUN ZIPLINE_BUILD=true yarn build

# Use Alpine Linux as the final image
FROM base

COPY --from=builder /zipline/build ./build
COPY --from=builder /zipline/.next ./.next

COPY --from=builder /zipline/mimes.json ./mimes.json
COPY --from=builder /zipline/code.json ./code.json

# remove the ZIPLINE_BUILD env var
RUN unset ZIPLINE_BUILD

# clean
RUN yarn cache clean --all
RUN rm -rf /tmp/* /root/*

CMD ["node", "--enable-source-maps", "build/server.js"]