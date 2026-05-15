FROM node:24-alpine3.22 AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable \
    && apk add --no-cache ffmpeg=6.1.2-r2 tzdata=2026b-r0

WORKDIR /zipline

COPY prisma ./prisma
COPY package.json .
COPY pnpm-lock.yaml .
COPY pnpm-workspace.yaml .

FROM base AS deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile

FROM base AS builder
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY src ./src
COPY .gitignore ./.gitignore

COPY postcss.config.cjs ./postcss.config.cjs
COPY prettier.config.cjs ./prettier.config.cjs
COPY eslint.config.mjs ./eslint.config.mjs
COPY vite.config.ts ./vite.config.ts
COPY tsup.config.ts ./tsup.config.ts
COPY tsconfig.json ./tsconfig.json
COPY mimes.json ./mimes.json
COPY code.json ./code.json
COPY vite-env.d.ts ./vite-env.d.ts
COPY scripts ./scripts

RUN ZIPLINE_BUILD=true pnpm run build

FROM base

COPY --from=deps /zipline/node_modules ./node_modules

COPY --from=builder /zipline/build ./build

COPY --from=builder /zipline/mimes.json ./mimes.json
COPY --from=builder /zipline/code.json ./code.json

RUN pnpm prisma generate \
    && rm -rf /tmp/* /root/*

ENV NODE_ENV=production
ENV ZIPLINE_ROOT=/zipline

ARG ZIPLINE_GIT_SHA
ENV ZIPLINE_GIT_SHA=${ZIPLINE_GIT_SHA:-"unknown"}

# add scripts
COPY docker/entrypoint.sh /zipline/entrypoint
COPY docker/ziplinectl.sh /zipline/ziplinectl

RUN ln -s /zipline/ziplinectl /usr/local/bin/ziplinectl

ENTRYPOINT ["/zipline/entrypoint"]
