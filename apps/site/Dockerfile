# Built from the repository root: docker build -f apps/site/Dockerfile .
# The image of the public web: the service site, which answers from the bucket, and the job
# generate-site, which writes it from the database. Node runs the TypeScript sources by stripping
# types, so the image keeps the workspace layout, as the image of the room server does (ADR 0003).
# packages/db brings packages/game and packages/dilemmas, whose types and tables it uses; the
# illustrations of La Palanca come from the web of the app, at the same path next to apps/site.

FROM node:24.21.0-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS install
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/site/package.json apps/site/
COPY packages/game/package.json packages/game/
COPY packages/dilemmas/package.json packages/dilemmas/
COPY packages/db/package.json packages/db/
RUN pnpm install --prod --frozen-lockfile --ignore-scripts --filter '@thelever-app/site...'

FROM node:24.21.0-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20
WORKDIR /app
ENV NODE_ENV=production
COPY --from=install /app/node_modules node_modules
COPY --from=install /app/apps/site/node_modules apps/site/node_modules
COPY --from=install /app/packages/db/node_modules packages/db/node_modules
COPY apps/site/package.json apps/site/
COPY apps/site/src apps/site/src
COPY apps/site/assets apps/site/assets
COPY apps/web/src/assets/brand apps/web/src/assets/brand
COPY packages/game/package.json packages/game/
COPY packages/game/src packages/game/src
COPY packages/dilemmas/package.json packages/dilemmas/
COPY packages/dilemmas/src packages/dilemmas/src
COPY packages/db/package.json packages/db/
COPY packages/db/src packages/db/src
USER node
CMD ["node", "apps/site/src/server.ts"]
