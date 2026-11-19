# Built from the repository root: docker build -f apps/realtime/Dockerfile .
# Node runs the TypeScript sources by stripping types, but not under node_modules,
# so the image keeps the workspace layout instead of using `pnpm deploy` (ADR 0003).
# Every workspace package apps/realtime depends on is copied with its manifest, sources and, when it
# has production dependencies, its node_modules (packages/game and packages/dilemmas have none: a
# context depends on no other package, ADR 0001). packages/db also brings
# its migrations, which the migrate job runs from this same image. The image carries the countries of
# DB-IP Lite (CC BY 4.0) of the month it is built, which the room server reads for the region of the
# first access; every deploy brings a newer one.

FROM node:24.21.0-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS install
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/realtime/package.json apps/realtime/
COPY packages/game/package.json packages/game/
COPY packages/dilemmas/package.json packages/dilemmas/
COPY packages/protocol/package.json packages/protocol/
COPY packages/db/package.json packages/db/
COPY packages/integrations/package.json packages/integrations/
COPY packages/identity/package.json packages/identity/
COPY packages/consent/package.json packages/consent/
RUN pnpm install --prod --frozen-lockfile --ignore-scripts --filter '@thelever-app/realtime...'

FROM node:24.21.0-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS countries
WORKDIR /app
COPY apps/realtime/scripts/download-countries.ts ./
RUN node download-countries.ts /app/countries/dbip-country-lite.mmdb

FROM node:24.21.0-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20
WORKDIR /app
ENV NODE_ENV=production
ENV DBIP_COUNTRY_FILE=/app/countries/dbip-country-lite.mmdb
COPY --from=countries /app/countries countries
COPY --from=install /app/node_modules node_modules
COPY --from=install /app/apps/realtime/node_modules apps/realtime/node_modules
COPY --from=install /app/packages/protocol/node_modules packages/protocol/node_modules
COPY --from=install /app/packages/db/node_modules packages/db/node_modules
COPY --from=install /app/packages/integrations/node_modules packages/integrations/node_modules
COPY apps/realtime/package.json apps/realtime/
COPY apps/realtime/src apps/realtime/src
COPY packages/game/package.json packages/game/
COPY packages/game/src packages/game/src
COPY packages/dilemmas/package.json packages/dilemmas/
COPY packages/dilemmas/src packages/dilemmas/src
COPY packages/protocol/package.json packages/protocol/
COPY packages/protocol/src packages/protocol/src
COPY packages/db/package.json packages/db/
COPY packages/db/src packages/db/src
COPY packages/integrations/package.json packages/integrations/
COPY packages/integrations/src packages/integrations/src
COPY packages/identity/package.json packages/identity/
COPY packages/identity/src packages/identity/src
COPY packages/consent/package.json packages/consent/
COPY packages/consent/src packages/consent/src
USER node
# The telemetry loads first, so its instrumentations see every module the server loads.
CMD ["node", "--import", "./apps/realtime/src/telemetry/register.ts", "apps/realtime/src/server.ts"]
