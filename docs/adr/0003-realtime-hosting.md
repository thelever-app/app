# 0003. Real time and hosting

- Status: accepted
- Date: 2026-10-23
- Notion: [ADR 0003: tiempo real y hosting (ws en Cloud Run, Dockerfile propio, Cloud SQL y LISTEN/NOTIFY entre instancias)](https://app.notion.com/p/40295e6919c581dc86aad593a70a5756)

## Context

The decision phase already works against a simulated room (TSK-18). TSK-24 connects it to a real room server in `apps/realtime`, so the transport, where it runs and how it is packaged must be decided now. The database is PostgreSQL with Kysely (ADR 0002); its provider is decided here.

Forces:

1. RNF-08: progress reaches the other devices in under 500 ms (p95) with 50 rooms at once. RNF-03: rooms of 3 to 50 players, one device each.
2. The server is the authority (ADR 0001): the client draws what it receives and never decides rules.
3. GDPR: everything in an EU region (Madrid, `europe-southwest1`).
4. One developer, near-zero cost without players, no servers to patch by hand, everything on GCP next to Firebase Auth.
5. Node runs TypeScript by stripping types, without a build step, and it refuses to strip types under `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`, checked on 23 October). Workspace packages publish `.ts` sources.
6. Inherited from TSK-18 and the review of PR #9: a `GameStateDto` computed before a `ProgressUpdatedDto` can arrive after it and move another player's progress backwards; rejected commands need an `ErrorDto` that reaches the screen; reconnection and players of one room spread across instances shape the disconnection task.

Facts about Cloud Run, from its [WebSockets documentation](https://docs.cloud.google.com/run/docs/triggering/websockets) and [request timeout documentation](https://docs.cloud.google.com/run/docs/configuring/request-timeout):

- A WebSocket is an HTTP request: Cloud Run drops it when the request timeout is reached (default 300 s, maximum 3600 s), whatever the server does. Clients must reconnect.
- Session affinity is best effort: a connection stays on its instance, but a new connection from the same client may land on another one.
- Instances share nothing; state that several instances need must live outside them.
- Up to 1000 concurrent connections per instance.
- An instance with an open WebSocket keeps its CPU and is billed for it the whole time; without connections, the service scales to zero.

## Options considered

**Transport**

1. `ws`. Plain WebSocket, small, no protocol of its own; rooms, heartbeats and reconnection are written by hand. The contract in `packages/protocol` is already plain JSON validated with Zod.
2. Socket.IO. Rooms, acknowledgements and reconnection built in, and a Redis adapter for several instances. Adds its own protocol on top of the WebSocket, a client library and a second way to model rooms next to the domain.
3. Firestore listeners. No server of our own, but the client would read state directly, which contradicts the server as authority (ADR 0001) and `apps/realtime`.

**Hosting**

1. Cloud Run. Containers, WebSockets, scales to zero, no machine to patch. Connections are cut at the request timeout.
2. A Compute Engine VM. Long connections without a cut, but always on and patched by hand.

**Sharing events between instances**

1. One instance only (`--max-instances 1`). Simplest, but 1000 connections per instance is below the worst case of RNF-03 × RNF-08 (50 rooms × 50 players = 2500), and a reconnection after a deploy still lands on a new instance.
2. PostgreSQL `LISTEN/NOTIFY`. Each instance listens on one connection and forwards events to its own sockets. No extra service; payloads up to 8000 bytes, so events carry ids, not state. The database is already the source of truth (ADR 0002).
3. Memorystore for Redis with Pub/Sub. The documented pattern, but a second always-on service with its own minimum monthly cost and one more place for personal data.

**PostgreSQL provider**

1. Cloud SQL for PostgreSQL, Enterprise edition, zonal. In Madrid, from the Cloud Billing catalogue on 23 October: micro shared-core instance 0.01109 €/h (about 8.10 €/month), small 0.03696 €/h (about 27 €/month), SSD storage 0.17952 €/GiB-month (10 GiB minimum, about 1.80 €/month), plus backups. No free tier. A stopped instance only pays storage.
2. AlloyDB. Far above the needs and the budget.
3. PostgreSQL on a VM. Cheapest, but patched and backed up by hand.
4. A provider outside GCP with an EU region and scale to zero (Neon, Supabase). Cheaper while idle, but leaves GCP, adds a processor under GDPR and does not reach Cloud Run through the Cloud SQL connector.

**Images across environments**

1. A third project, `thelever-app-shared`, that only holds Artifact Registry and builds the images; every environment pulls from it. Production does not depend on the project where tests run.
2. The registry in `thelever-app-dev`, read by production. Simpler, but production depends on the test project.
3. A build in each project. Fully isolated, but production would not run the artifact that was tested.

**Promotion to production**

1. Every merge to `main` deploys to development; production deploys the same image after a manual approval in GitHub's `prod` environment.
2. Production deploys when a version tag is pushed.

**Packaging**

1. Our own `Dockerfile`.
2. Buildpacks. No Dockerfile to maintain, but they assume a build step and hide how the workspace is installed.

## Decision

- **Transport:** `ws`, attached to the HTTP server of `apps/realtime` (the same Express app keeps `/health`). The contract stays in `packages/protocol`, validated with `parse` in both directions. The player and the game come from the connection, never from a message (TSK-18).
- **Hosting:** Cloud Run in `europe-southwest1`, request timeout 3600 s, session affinity on, minimum instances 0. The PWA goes to Firebase Hosting.
- **Environments:** `dev` and `prod`, one GCP project each (`thelever-app-dev`, `thelever-app-prod`), each with its own Cloud Run service, Cloud SQL instance and Firebase, so tests never touch real players' data. A third project, `thelever-app-shared`, holds the Artifact Registry repository `thelever-app` and runs the image builds.
- **Delivery:** trunk-based. An image is built once per merge to `main`, deployed to `dev`, and the same digest is promoted to `prod` after a manual approval in GitHub's `prod` environment. No release branches.
- **Packaging:** our own `Dockerfile` for `apps/realtime`, built with Cloud Build and stored in Artifact Registry. The image keeps the workspace layout: it copies the root manifests, the lockfile and the packages `apps/realtime` needs, installs with `pnpm install --prod --frozen-lockfile --filter '@thelever-app/realtime...'` and starts with `node apps/realtime/src/server.ts`. No `pnpm deploy`, because it moves workspace packages under `node_modules`.
- **State and instances:** the state of a game lives in PostgreSQL, never only in an instance's memory. An instance keeps just the sockets connected to it. After a use case saves, the adapter publishes the event with `NOTIFY` on the game's channel; every instance with sockets in that game reads the game and sends each of its players what they need. Session affinity reduces cross-instance traffic but nothing depends on it.
- **Message order:** every `GameStateDto` and `ProgressUpdatedDto` carries the version of the game it was computed from (the aggregate's version stored by the PostgreSQL adapter). The client applies a message only if its version is not older than the one it holds. Inside one instance, the commands of one game are handled one after another.
- **Errors:** a rejected command gets an `ErrorDto` back on the same socket, with a stable error code taken from the domain error and the type of the command it answers. The client translates the code; the server never sends text for the screen.
- **Reconnection:** the client reconnects on any close with backoff and jitter, authenticates again, and the server answers with a fresh `GameStateDto`. Any instance can serve it, because the state is in PostgreSQL. The server sends WebSocket pings to detect dead connections.
- **PostgreSQL provider:** Cloud SQL for PostgreSQL 18, Enterprise edition, zonal, micro instance, one per environment, with backups, deletion protection, encrypted connections only and IAM database authentication enabled. The `dev` instance is stopped when unused. Cloud Run reaches it through the Cloud SQL connector. Size and high availability are revisited before launch.

## Consequences

- Easier: one place for state (PostgreSQL), so restarts, deploys and the hourly cut lose nothing; no extra service to run; the same Dockerfile works locally, in CI and in Cloud Run; everything stays in Madrid; production runs exactly the image tested in development.
- Harder: rooms, heartbeats, reconnection and the version check are written by hand; every event goes through PostgreSQL; integration tests need a PostgreSQL with `LISTEN/NOTIFY`.
- Cost: Cloud SQL is the fixed cost (about 10 € per month and environment while it runs; `dev` only while in use). Cloud Run costs nothing without players, and bills an instance's CPU while any socket is open.
- Watch: TSK-24 measures on Cloud Run with the real server (wss, the cut at the timeout, reconnection to the room, a room spread across instances) and RNF-08 on real devices; if the results contradict this ADR, a new ADR supersedes it. `NOTIFY` payloads stay below 8000 bytes. A dedicated `LISTEN` connection does not go through a transaction pooler.
