/**
 * How often the room server pings each socket. A phone that loses the network does not close its
 * socket: it goes silent, and only the next unanswered ping tells. So a player without network is
 * seen as disconnected between one and two intervals after.
 */
export const PING_INTERVAL_MS = 10_000;
