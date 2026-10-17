# 0001. Architecture and testing strategy

- Status: accepted
- Date: 2026-10-15
- Notion: [ADR 0001: arquitectura y estrategia de tests (DDD, hexagonal y BDD en dos niveles)](https://app.notion.com/p/3fa95e6919c581bb8105c6c894a93074)

## Context

TheLever is a real-time party game whose rules are subtle (private votes, predictions over balanced subsets, a host role that moves on disconnection, progress that must never reveal answers) and whose data feeds a research dataset. The rules are already written as Gherkin scenarios in business language, one Feature per use case, with Notion as the source. Several scenarios cannot be observed in the user interface: the option order recorded with each answer, balanced prediction subsets, points calculated before the reveal. The project is built by one developer who is also learning React and Express, and who will later hand part of the work to an agentic coding flow, so the structure must make the rules easy to find and safe to change.

Forces:

1. The rules of the game must be testable without a browser, a network or a database.
2. The same words must mean the same thing in the product, the scenarios and the code.
3. Every scenario must be executable, and the CI must tell pending work from broken work.
4. The transport, database and hosting are still undecided (ADR 0002), so the core must not depend on them.

## Options considered

1. **Layered app per runtime, scenarios run end to end only.** Simple to start. The rules end up split between the React client and the Express server, scenarios that are not visible in the UI cannot be tested, and the suite is slow and brittle.
2. **Domain-driven design with hexagonal architecture, scenarios run at two depths.** Bounded contexts with a pure domain, an application layer of use cases and adapters around them. The same Features run against the application layer for every scenario and against the full system for the scenarios visible on screen. More structure up front, and it needs a shared ubiquitous language.
3. **As option 2, but four Gherkin runners (acceptance and end to end, for frontend and for backend).** A frontend acceptance runner would need a fake server and would end up testing that fake; a backend end-to-end runner duplicates acceptance plus transport.

## Decision

Option 2.

**Bounded contexts.** Game (rooms, decision phase, reveal and points), Dilemmas (versions, translations, catalog and authoring), Moderation, Consent and research (`consent` and `events`, with the single consent gate) and Identity. Each context is modelled when its first story arrives. Game comes first and lives in `packages/game`.

**Layers inside each context.**

- Domain: aggregates, value objects and domain events. Pure TypeScript, no I/O and no dependency on any other layer or package outside the context.
- Application: one use case per command or query, depending only on the domain and on ports (interfaces) it declares, such as a room repository, a clock or a notifier.
- Adapters: implementations of the ports and entry points. WebSocket and HTTP in `apps/realtime`, React in `apps/web`, the database in `packages/db`, and in-memory versions for tests and for the simulated room.

The server is authoritative: the client renders state received from the application layer and never decides game rules.

**Ubiquitous language.** A glossary in Notion lists every term in Spanish and English with its definition. Scenarios and code use the English terms.

**Testing.**

| Level       | Runs against                                                    | Tool                                       | Scope                                                            |
| ----------- | --------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| Acceptance  | The application layer, in Node, with in-memory adapters         | Cucumber.js, profile `acceptance`          | Every scenario not tagged `@todo`                                |
| End to end  | The built web app, the room server and several browser contexts | Cucumber.js with Playwright, profile `e2e` | Scenarios tagged `@ui`                                           |
| Unit        | Domain and application code                                     | Vitest                                     | Test-driven: no domain code without a failing test asking for it |
| Component   | React components                                                | Vitest with Testing Library                | Rendering and interaction of each screen                         |
| Integration | Express routes and WebSocket handlers                           | Vitest with supertest and a `ws` client    | Each adapter in isolation                                        |

Step texts are written once. Step definitions talk to a driver that expresses actions and observations in domain terms; the acceptance profile uses a driver that calls use cases and the end-to-end profile one that drives browsers.

**Workflow.** Outside in, with two loops: a scenario fails, unit tests drive the domain and application code until it passes, then refactor. Tags live in Notion: `@ui` for scenarios visible on screen and `@todo` for scenarios not implemented yet. The CI runs `not @todo` in the acceptance profile on every pull request; removing `@todo` is part of finishing a story. The end-to-end profile is added with the real room server.

## Consequences

- Easier: the rules of the game live in one place and are tested in milliseconds; transport, database and hosting can change without touching them; scenarios that are invisible in the UI are executable; an agentic flow later gets a clear map of where each change goes.
- Harder: more files and indirection than a layered app; ports and adapters must be kept thin; the glossary and the Gherkin must be maintained together.
- Watch: the domain must not import from adapters (enforce with a lint rule on imports); the in-memory adapters used by acceptance tests must keep the same contract as the real ones, checked by shared contract tests when the real adapters arrive; acceptance tests must stay fast enough to run on every pull request.
