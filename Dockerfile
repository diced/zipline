FROM ghcr.io/diced/prisma-binaries:3.15.x as prisma

FROM alpine:3.16 AS deps
RUN mkdir -p /prisma-engines
WORKDIR /build

COPY .yarn .yarn
COPY package.json yarn.lock .yarnrc.yml ./

RUN apk add --no-cache nodejs yarn
RUN yarn install --immutable

FROM alpine:3.16 AS builder
WORKDIR /build

COPY --from=prisma /prisma-engines /prisma-engines
ENV PRISMA_QUERY_ENGINE_BINARY=/prisma-engines/query-engine \
  PRISMA_MIGRATION_ENGINE_BINARY=/prisma-engines/migration-engine \
  PRISMA_INTROSPECTION_ENGINE_BINARY=/prisma-engines/introspection-engine \
  PRISMA_FMT_BINARY=/prisma-engines/prisma-fmt \
  PRISMA_CLI_QUERY_ENGINE_TYPE=binary \
  PRISMA_CLIENT_ENGINE_TYPE=binary

RUN apk add --no-cache nodejs yarn openssl openssl-dev

COPY --from=deps /build/node_modules ./node_modules
COPY src ./src
COPY prisma ./prisma
COPY .yarn .yarn
COPY package.json yarn.lock .yarnrc.yml esbuild.config.js next.config.js next-env.d.ts zip-env.d.ts tsconfig.json mimes.json ./

ENV ZIPLINE_DOCKER_BUILD 1
ENV NEXT_TELEMETRY_DISABLED 1

RUN yarn build

FROM alpine:3.16 AS runner
WORKDIR /zipline

COPY --from=prisma /prisma-engines /prisma-engines
ENV PRISMA_QUERY_ENGINE_BINARY=/prisma-engines/query-engine \
  PRISMA_MIGRATION_ENGINE_BINARY=/prisma-engines/migration-engine \
  PRISMA_INTROSPECTION_ENGINE_BINARY=/prisma-engines/introspection-engine \
  PRISMA_FMT_BINARY=/prisma-engines/prisma-fmt \
  PRISMA_CLI_QUERY_ENGINE_TYPE=binary \
  PRISMA_CLIENT_ENGINE_TYPE=binary

RUN apk add --no-cache nodejs yarn openssl openssl-dev

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /build/.next ./.next
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules

COPY --from=builder /build/next.config.js ./next.config.js
COPY --from=builder /build/src ./src
COPY --from=builder /build/prisma ./prisma
COPY --from=builder /build/tsconfig.json ./tsconfig.json
COPY --from=builder /build/package.json ./package.json
COPY --from=builder /build/mimes.json ./mimes.json

CMD ["node_modules/.bin/tsx", "src/server"]