FROM node:18-alpine3.16 as base

ENV PNPM_HOME="/pnpm"
RUN corepack enable pnpm
RUN corepack prepare pnpm@latest --activate

WORKDIR /zipline


COPY prisma ./prisma
COPY package.json .
COPY pnpm-lock.yaml .

FROM base as deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base as builder
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY src ./src
COPY next.config.js ./next.config.js
COPY tsup.config.ts ./tsup.config.ts
COPY tsconfig.json ./tsconfig.json
COPY mimes.json ./mimes.json
COPY code.json ./code.json
COPY themes ./themes

ENV NEXT_TELEMETRY_DISABLED=1 \
  NODE_ENV=production

RUN ZIPLINE_BUILD=true pnpm run build

FROM base

COPY --from=deps /zipline/node_modules ./node_modules

COPY --from=builder /zipline/build ./build
COPY --from=builder /zipline/.next ./.next

COPY --from=builder /zipline/mimes.json ./mimes.json
COPY --from=builder /zipline/code.json ./code.json

# clean
RUN yarn cache clean --all
RUN rm -rf /tmp/* /root/*

CMD ["node", "--enable-source-maps", "build/server.js"]