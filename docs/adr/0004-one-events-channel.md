# 0004. One channel for the events between instances

- Status: accepted
- Date: 2026-11-02
- Amends: [0003](0003-realtime-hosting.md), the channel of `LISTEN/NOTIFY`
- Notion: [ADR 0004: un solo canal de LISTEN/NOTIFY para todas las partidas (cambia el canal del ADR 0003)](https://app.notion.com/p/40c95e6919c58142b588c52087d4159c)

## Context

ADR 0003 has every instance of the room server tell the others what happens through PostgreSQL `LISTEN/NOTIFY`, on the channel of each game. Building it showed that a channel per game does not fit the events:

1. `ConnectionChangedEvent` belongs to the room, and carries the id of the room, not of a game.
2. `DisconnectConnectionsUseCase`, which closes the connections of an instance that died, works on a room and knows no game.
3. To publish on the channel of a game, the notifier would have to look up in the database, for each event of a room, which game it is playing.

Each notification already carries its recipients and the event (ids, counters and versions), not just the id of the game.

## Options considered

1. **A channel per game**, as ADR 0003 says. Each instance runs `LISTEN` and `UNLISTEN` as its sockets come and go, and must listen again to all of them after losing the connection. Events of a room need a lookup first.
2. **A channel per room.** Fits the events of the room, but `ProgressUpdatedEvent` carries the game, not the room, so it needs either a lookup or a new field in the domain event.
3. **One channel for everything.** Every instance receives every notification and delivers only to the players it has sockets for.

## Decision

Option 3: a single channel, `game_events`.

- Each notification is `{ playerIds, event }`, published with `pg_notify` inside the transaction of the command, so it leaves only if the command commits.
- PostgreSQL refuses a payload of 8000 bytes or more, so the notifier splits the recipients into as many notifications as needed. Each `pg_notify` runs in a savepoint: a statement that fails aborts the whole transaction, and its commit would undo the command without an error; with the savepoint, a failed notification loses only itself.
- One dedicated connection per instance listens to it, never taken from a pool, and shows up as `game_events_listener` in `pg_stat_activity`.
- If that connection is lost, or stops answering a periodic `select 1` (a network cut may never end it; it also has TCP keepalive), the instance closes it, connects again with a growing wait and sends a fresh `GameStateDto` to each of its sockets, since what was published meanwhile is lost.

## Consequences

- Easier: no `LISTEN`/`UNLISTEN` per game, a single channel to listen again to after a cut, no lookup to publish an event of a room.
- Harder: every instance reads every notification. With at most 2 instances per revision, two revisions side by side during a deploy and payloads of a few kilobytes, it costs nothing; it is revisited if the number of instances grows by an order of magnitude.
- Harder: after a deploy, the previous revision keeps its sockets until they close, up to the request timeout (measured on 2026-11-03: still open 10 minutes after the roll-out, with no `SIGTERM`), and keeps listening to `game_events`. Every notification must be readable by the previous revision too: a field is added before it is used and removed only once no revision reads it, as with the migrations.
- Watch: a room spread across two instances works on Cloud Run (measured on 2026-11-03). A room of 50 players fits in one notification of about 2 KB; a larger one takes several, which the tests cover but no measurement on Cloud Run yet.
