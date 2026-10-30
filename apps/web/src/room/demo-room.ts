import type { SimulatedRoomOptions } from './simulated-room-connection.ts';

/**
 * The room the web opens in development: you are Ana, three fake players answer at different
 * paces, and the seed dilemmas of `@thelever-app/dilemmas/seed`, the same the room server starts with.
 */
export const DEMO_ROOM: SimulatedRoomOptions = {
  nickname: 'Ana',
  language: 'es',
  others: [
    { nickname: 'Luis', answerEveryMs: 3000 },
    { nickname: 'Marta', answerEveryMs: 5000 },
    { nickname: 'Pablo', answerEveryMs: 8000 },
  ],
};
