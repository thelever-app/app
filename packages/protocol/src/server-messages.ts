import { z } from 'zod';
import { ClientMessageTypeDto } from './client-messages.ts';

/** Goes up with every change of the game. The client drops anything older than what it holds (ADR 0003). */
const GameVersionDto = z.number().int().nonnegative();

/** Goes up with every change of who is connected to the room. Ordered apart from the game version. */
const RoomVersionDto = z.number().int().nonnegative();

/**
 * What the screen needs to draw the decision phase: who is playing, how far each one is,
 * and the answers of the player who receives it. Never the answers of anybody else.
 */
export const GameStateDto = z.strictObject({
  type: z.literal('game-state'),
  gameId: z.string().min(1),
  /** The version of the game this state was computed from. */
  gameVersion: GameVersionDto,
  /** The version of the connections of the room this state was computed from. */
  roomVersion: RoomVersionDto,
  /** The player who receives the message. */
  playerId: z.string().min(1),
  /** In the order every player gets them, in the language of the player. */
  dilemmas: z
    .array(
      z.strictObject({
        dilemmaId: z.string().min(1),
        text: z.string().min(1),
        /** A vote is the optionId of one of them. */
        options: z
          .array(z.strictObject({ optionId: z.string().min(1), text: z.string().min(1) }))
          .min(1),
      }),
    )
    .min(1),
  players: z
    .array(
      z.strictObject({
        playerId: z.string().min(1),
        nickname: z.string().min(1),
        progress: z.number().int().nonnegative(),
        /** False while the player has no open connection: the others see them as disconnected. */
        connected: z.boolean(),
      }),
    )
    .min(1),
  /** Only the answers of the player who receives the message. */
  answers: z.array(
    z.strictObject({
      dilemmaId: z.string().min(1),
      vote: z.string().min(1),
    }),
  ),
});

/** Another player's progress went up. It never carries what they answered. */
export const ProgressUpdatedDto = z.strictObject({
  type: z.literal('progress-updated'),
  /** The version of the game after this progress. */
  gameVersion: GameVersionDto,
  playerId: z.string().min(1),
  progress: z.number().int().nonnegative(),
});

/** Another player disconnected or reconnected. */
export const ConnectionChangedDto = z.strictObject({
  type: z.literal('connection-changed'),
  /** The version of the connections of the room after this change. */
  roomVersion: RoomVersionDto,
  playerId: z.string().min(1),
  connected: z.boolean(),
});

/**
 * Why the server rejected a message. Stable codes, taken from the domain errors;
 * the client turns them into text, the server never sends text for the screen.
 */
export const ErrorCodeDto = z.enum([
  'invalid-message',
  'unsupported-contract-version',
  'not-connected',
  'invalid-token',
  'room-not-found',
  'game-not-found',
  'player-not-in-game',
  'decision-phase-not-started',
  'dilemma-not-in-game',
  'dilemma-not-reached',
  'option-not-in-dilemma',
  'dilemma-not-found',
]);

/** The answer to a rejected message, on the same connection. */
export const ErrorDto = z.strictObject({
  type: z.literal('error'),
  /** The type of the rejected message, or null when the message could not even be read. */
  command: ClientMessageTypeDto.nullable(),
  code: ErrorCodeDto,
});

/** Every message the room server sends to a player. */
export const ServerMessageDto = z.discriminatedUnion('type', [
  GameStateDto,
  ProgressUpdatedDto,
  ConnectionChangedDto,
  ErrorDto,
]);

export type GameStateDto = z.infer<typeof GameStateDto>;
export type ProgressUpdatedDto = z.infer<typeof ProgressUpdatedDto>;
export type ConnectionChangedDto = z.infer<typeof ConnectionChangedDto>;
export type ErrorCodeDto = z.infer<typeof ErrorCodeDto>;
export type ErrorDto = z.infer<typeof ErrorDto>;
export type ServerMessageDto = z.infer<typeof ServerMessageDto>;
