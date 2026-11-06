# 0005. Observability

- Status: accepted
- Date: 2026-11-06
- Notion: [ADR 0005: observabilidad (OpenTelemetry por OTLP a la API de Telemetry de Madrid, registros JSON por stdout, muestreo por partida)](https://app.notion.com/p/41095e6919c5810bbb10f0b97e04e50d)

## Context

The room server ran in Cloud Run with `console.log` and nothing else: no traces, no metrics, logs as loose text. RNF-08 (progress reaches the others in under 500 ms, p95) and RNF-17 (traces that cross the client, the API and the room server, and logs linked to them) need a way to see where time goes and what failed. Forces:

1. Everything in Madrid (`europe-southwest1`), in the GCP projects of [0003](0003-realtime-hosting.md), with no other processor under GDPR.
2. Ids of rooms, games and players make logs and traces pseudonymised personal data. IP addresses, user agents, nicknames, votes, predictions, tokens and Firebase UIDs must never reach them (RES-70).
3. Near-zero cost without players: Cloud Trace gives 2.5 million spans a month for free; metrics sent with OTLP are billed per sample.
4. Google's OpenTelemetry exporters for Cloud Trace and Cloud Monitoring are deprecated and pull in the 2.x SDK and `googleapis`; the supported path is OTLP to the Telemetry API.
5. The WebSocket upgrade produces no span: a message on a socket is invisible to automatic instrumentation.

## Options considered

1. OTLP from the process to the regional Telemetry API, with `google-auth-library` for the token. No extra container; one exporter per signal.
2. An OpenTelemetry Collector as a sidecar, as Google recommends. One more container per instance, with its own CPU and memory, and one more image to maintain.
3. Google's deprecated exporters. Two copies of the SDK core and about 212 MB more.

For logs: JSON on `stdout`, which Cloud Run collects for free, against the OpenTelemetry logs SDK (one more exporter for what `stdout` already does) or `pino` (a dependency for some 30 lines).

## Decision

- **Export:** OpenTelemetry JS 3.0, OTLP over protobuf to `https://telemetry.europe-southwest1.rep.googleapis.com`, authenticated with the credentials of `realtime@` (`roles/telemetry.writer` and `roles/serviceusage.serviceUsageConsumer`). Loaded with `node --import` and the ESM hook, only on Cloud Run; locally and in tests nothing is exported. The resource carries `gcp.project_id`, `service.instance.id` and `cloud.region`, which the API requires. Shut down within 2 s on `SIGTERM`.
- **Logs:** one JSON line per entry on `stdout`, with `severity`, `message` and the trace and span of the active span (`logging.googleapis.com/trace`, `spanId`, `trace_sampled`), so Cloud Logging links them and Error Reporting groups the errors. `packages/db` receives a `Logger` instead of calling `console.error`. A rejected command is logged as `INFO`.
- **Traces:** automatic for http, Express and pg (`requireParentSpan: true`, no `/health`); by hand, one span per WebSocket message and per disconnection, with `game.id` and `room.id`. The `NOTIFY` payload carries the `traceparent`, and each instance that delivers an event opens one span, not one per player. Everything lives in adapters, never in the domain or the application.
- **The client in the trace:** the web creates a W3C `traceparent` per command and sends it in the `traceparent` header and in an optional field of `connect` and `answer-dilemma`. No SDK in the browser.
- **Metrics:** `thelever.ws.connections`, `thelever.ws.message.duration` (by message type and outcome), `thelever.game.event.delay` (from the `NOTIFY` to the delivery in each instance) and `thelever.errors`, exported every 60 s. Labels with few values only: never an id.
- **Sampling:** a sampler that decides by the hash of `game.id`, inside a parent-based sampler, so a game is kept whole or not at all. The ratio is `OTEL_TRACES_SAMPLER_ARG`, 1.0 until there is traffic.
- **RES-70:** the request log of Cloud Run (`run.googleapis.com/requests`, which holds the client IP) is excluded from the `_Default` sink; the http server span drops `client.address`, `network.peer.address`, `network.peer.port` and `user_agent.original`. A test fails if they come back.
- **Location:** a log bucket in `europe-southwest1` with 30 days in each project, with `_Default` routed to it; the observability location of each project is `europe-southwest1`. `_Required` (audit, 400 days) stays in `global`: it cannot move and holds no player IPs.
- **Dashboard and alerts:** in `ops/monitoring/`, applied with `node ops/monitoring/apply.ts dev|prod` with the credentials of whoever runs it; the deployment does not touch them.

## Consequences

- Easier: one trace follows a command from the web through every instance it reaches; a log line links to its trace; a game can be followed by `game.id`; changing the backend means changing an endpoint, not the code.
- Harder: WebSocket spans are written by hand; the ESM hook must load before anything else; spans that enter through the Telemetry API cannot be read with the Cloud Trace v1 API, only in the Trace Explorer.
- Cost: spans above 2.5 million a month cost 0.179 € per million; metric samples cost 0.053 € per million with no free tier. Cents a month today, and nothing with zero instances.
- Watch: the cardinality of metric labels; the sampling ratio of prod once there is traffic; any new attribute that could carry an IP or a user agent.
