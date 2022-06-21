FROM frolvlad/alpine-glibc AS deps
WORKDIR /build

COPY .yarn .yarn
COPY package.json yarn.lock .yarnrc.yml ./

RUN apk add --no-cache libc6-compat nodejs yarn
RUN yarn install --immutable

FROM frolvlad/alpine-glibc AS builder
WORKDIR /build

RUN apk add --no-cache nodejs yarn libc6-compat openssl openssl-dev

COPY --from=deps /build/node_modules ./node_modules
COPY src ./src
COPY scripts ./scripts
COPY prisma ./prisma
COPY .yarn .yarn
COPY package.json yarn.lock .yarnrc.yml esbuild.config.js next.config.js next-env.d.ts zip-env.d.ts tsconfig.json ./

ENV ZIPLINE_DOCKER_BUILD 1
ENV NEXT_TELEMETRY_DISABLED 1

RUN cat prisma/schema.prisma

RUN yarn build

FROM frolvlad/alpine-glibc AS runner
WORKDIR /zipline

RUN apk add --no-cache nodejs yarn libc6-compat openssl openssl-dev

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /build/.next ./.next
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules

COPY --from=builder /build/next.config.js ./next.config.js
COPY --from=builder /build/src ./src
COPY --from=builder /build/scripts ./scripts
COPY --from=builder /build/prisma ./prisma
COPY --from=builder /build/tsconfig.json ./tsconfig.json
COPY --from=builder /build/package.json ./package.json

CMD ["node", "dist/server"]