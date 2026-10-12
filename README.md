# TheLever

Social party game for friends and family built around moral dilemmas. Vote privately, predict your
group, debate the reveal. PWA.

## Repository layout

| Path                  | What lives there                                        |
| --------------------- | ------------------------------------------------------- |
| `apps/web`            | PWA game client (React + Vite)                          |
| `apps/realtime`       | Room server (Express)                                   |
| `packages/engine`     | Game state machine. Pure, no I/O                        |
| `packages/protocol`   | Versioned client-server messages                        |
| `packages/events`     | Versioned schema of game events with social context     |
| `packages/consent`    | Consent registry, revocation and the research data gate |
| `packages/db`         | Database schema, migrations and seeds                   |
| `packages/moderation` | Moderation interface                                    |
| `packages/evals`      | Evals for moderation and translation                    |
| `packages/ui`         | Design system                                           |
| `packages/config`     | Shared TypeScript, ESLint and Prettier config           |
| `docs/adr`            | Architecture decision records                           |

## Getting started

Requires Node 24 and pnpm via Corepack.

    corepack enable
    pnpm install
    pnpm dev:web        # http://localhost:5173
    pnpm dev:realtime   # http://localhost:3000/health

Before opening a pull request:

    pnpm lint && pnpm typecheck && pnpm test && pnpm format:check

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Every commit must be signed off under the DCO.

## License

[AGPL-3.0](LICENSE).
