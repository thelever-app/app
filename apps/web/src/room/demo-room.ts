import type { SimulatedRoomOptions } from './simulated-room-connection.ts';

/**
 * The room the web opens in development: you are Ana and host it, three fake players join the
 * lobby one after another and answer at different paces, and the seed dilemmas of
 * `@thelever-app/dilemmas/seed`, the same the room server starts with.
 */
export const DEMO_ROOM: SimulatedRoomOptions = {
  nickname: 'Ana',
  language: 'es',
  others: [
    { nickname: 'Luis', joinAfterMs: 1000, answerEveryMs: 3000 },
    { nickname: 'Marta', joinAfterMs: 2500, answerEveryMs: 5000 },
    { nickname: 'Pablo', joinAfterMs: 4000, answerEveryMs: 8000 },
  ],
};
