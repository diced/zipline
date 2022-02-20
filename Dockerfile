FROM node:16-alpine AS deps
WORKDIR /build

COPY package.json yarn.lock ./

RUN apk add --no-cache libc6-compat
RUN yarn install --frozen-lockfile

FROM node:16-alpine AS builder
WORKDIR /build

COPY --from=deps /build/node_modules ./node_modules
COPY src ./src
COPY server ./server
COPY scripts ./scripts
COPY prisma ./prisma
COPY package.json yarn.lock next.config.js next-env.d.ts zip-env.d.ts tsconfig.json ./

ENV ZIPLINE_DOCKER_BUILD 1
ENV NEXT_TELEMETRY_DISABLED 1

RUN yarn build

FROM node:16-alpine AS runner
WORKDIR /zipline

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 zipline
RUN adduser --system --uid 1001 zipline

COPY --from=builder --chown=zipline:zipline /build/.next ./.next
COPY --from=builder --chown=zipline:zipline /build/node_modules ./node_modules

COPY --from=builder /build/next.config.js ./next.config.js
COPY --from=builder /build/src ./src
COPY --from=builder /build/server ./server
COPY --from=builder /build/scripts ./scripts
COPY --from=builder /build/prisma ./prisma
COPY --from=builder /build/tsconfig.json ./tsconfig.json
COPY --from=builder /build/package.json ./package.json

USER zipline

CMD ["node", "server"]