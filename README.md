# TheLever

Social party game for friends and family built around moral dilemmas. Vote privately, predict your
group, debate the reveal. PWA.

## Repository layout

| Path                    | What lives there                                                           |
| ----------------------- | -------------------------------------------------------------------------- |
| `apps/web`              | PWA game client (React + Vite)                                             |
| `apps/realtime`         | Room server (Express + WebSocket) and its jobs, such as the catalog import |
| `apps/site`             | Public web of the dilemmas: generator job and service                      |
| `packages/game`         | Game bounded context: domain and use cases. Pure, no I/O                   |
| `packages/dilemmas`     | Dilemmas bounded context: the catalog, its search and its seed             |
| `packages/integrations` | Adapters between bounded contexts, on what each one publishes              |
| `packages/protocol`     | Versioned client-server messages                                           |
| `packages/events`       | Versioned schema of game events with social context                        |
| `packages/consent`      | Consent registry, revocation and the research data gate                    |
| `packages/db`           | PostgreSQL schema, migrations, seeds and adapters (Kysely)                 |
| `packages/moderation`   | Moderation interface                                                       |
| `packages/evals`        | Evals for moderation and translation                                       |
| `packages/ui`           | Design system                                                              |
| `packages/config`       | Shared TypeScript, ESLint and Prettier config                              |
| `tests`                 | Gherkin features with their acceptance and e2e runs (Cucumber)             |
| `ops/monitoring`        | Alerts, log-based metrics and dashboard of the deployed environments       |
| `docs/adr`              | Architecture decision records                                              |

## Getting started

Requires Node 24, pnpm via Corepack and Docker, for PostgreSQL.

    corepack enable
    pnpm install
    cp .env.example .env
    docker compose up -d --wait   # PostgreSQL on localhost:5432
    pnpm db:migrate
    pnpm db:seed                  # a few dilemmas to play with

Then, each in a terminal of its own:

    pnpm emulators      # Firebase Auth emulator, which the room server trusts locally
    pnpm dev:realtime   # http://localhost:3000/health
    pnpm dev:web        # http://localhost:5173

## Checks

Before opening a pull request:

    pnpm lint && pnpm typecheck && pnpm test && pnpm format:check
    pnpm test:db          # needs PostgreSQL: docker compose up -d --wait
    pnpm test:acceptance
    pnpm test:e2e         # builds the web; starts the Auth emulator, the room server and Chromium

The first time, install the browser of the e2e tests:

    pnpm --filter @thelever-app/tests exec playwright install chromium

The e2e run takes about a quarter of an hour. CI splits it among three jobs; to run one share of
the scenarios locally, set `E2E_SHARD`, such as `E2E_SHARD=1/3 pnpm test:e2e`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Every commit must be signed off under the DCO.

## License

[AGPL-3.0](LICENSE).
