FROM node:20-alpine3.19 AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm
RUN corepack prepare pnpm@latest --activate

RUN apk add --no-cache ffmpeg tzdata

WORKDIR /zipline

COPY prisma ./prisma
COPY package.json .
COPY pnpm-lock.yaml .

FROM base AS deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS builder
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY src ./src
COPY next.config.js ./next.config.js
COPY tsup.config.ts ./tsup.config.ts
COPY tsconfig.json ./tsconfig.json
COPY mimes.json ./mimes.json
COPY code.json ./code.json

ENV NEXT_TELEMETRY_DISABLED=1 \
  NODE_ENV=production

RUN ZIPLINE_BUILD=true pnpm run build

FROM base

COPY --from=deps /zipline/node_modules ./node_modules

COPY --from=builder /zipline/build ./build
COPY --from=builder /zipline/.next ./.next

COPY --from=builder /zipline/mimes.json ./mimes.json
COPY --from=builder /zipline/code.json ./code.json

RUN pnpm build:prisma

# clean
RUN rm -rf /tmp/* /root/*

ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "build/server"]
