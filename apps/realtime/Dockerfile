# Built from the repository root: docker build -f apps/realtime/Dockerfile .
# Node runs the TypeScript sources by stripping types, but not under node_modules,
# so the image keeps the workspace layout instead of using `pnpm deploy` (ADR 0003).
# Every workspace package apps/realtime depends on is copied with its manifest, sources and, when it
# has production dependencies, its node_modules (packages/dilemmas has none).

FROM node:24.21.0-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS install
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/realtime/package.json apps/realtime/
COPY packages/game/package.json packages/game/
COPY packages/dilemmas/package.json packages/dilemmas/
COPY packages/protocol/package.json packages/protocol/
RUN pnpm install --prod --frozen-lockfile --ignore-scripts --filter '@thelever-app/realtime...'

FROM node:24.21.0-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20
WORKDIR /app
ENV NODE_ENV=production
COPY --from=install /app/node_modules node_modules
COPY --from=install /app/apps/realtime/node_modules apps/realtime/node_modules
COPY --from=install /app/packages/game/node_modules packages/game/node_modules
COPY --from=install /app/packages/protocol/node_modules packages/protocol/node_modules
COPY apps/realtime/package.json apps/realtime/
COPY apps/realtime/src apps/realtime/src
COPY packages/game/package.json packages/game/
COPY packages/game/src packages/game/src
COPY packages/dilemmas/package.json packages/dilemmas/
COPY packages/dilemmas/src packages/dilemmas/src
COPY packages/protocol/package.json packages/protocol/
COPY packages/protocol/src packages/protocol/src
USER node
CMD ["node", "apps/realtime/src/server.ts"]
