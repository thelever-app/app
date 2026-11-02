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
- One dedicated connection per instance listens to it, never taken from a pool, and shows up as `game_events_listener` in `pg_stat_activity`.
- If that connection is lost, the instance connects again with a growing wait and sends a fresh `GameStateDto` to each of its sockets, since what was published meanwhile is lost.

## Consequences

- Easier: no `LISTEN`/`UNLISTEN` per game, a single channel to listen again to after a cut, no lookup to publish an event of a room.
- Harder: every instance reads every notification. With at most 3 instances and payloads of a few kilobytes, it costs nothing; it is revisited if the number of instances grows by an order of magnitude.
- Watch: payloads stay below 8000 bytes (about 2 KB with 50 recipients); the measurement of a room spread across instances checks it on Cloud Run.
