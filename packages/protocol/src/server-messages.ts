import { z } from 'zod';

/**
 * What the screen needs to draw the decision phase: who is playing, how far each one is,
 * and the answers of the player who receives it. Never the answers of anybody else.
 */
export const GameStateDto = z.strictObject({
  type: z.literal('game-state'),
  gameId: z.string().min(1),
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
  playerId: z.string().min(1),
  progress: z.number().int().nonnegative(),
});

/** Every message the room server sends to a player. */
export const ServerMessageDto = z.discriminatedUnion('type', [GameStateDto, ProgressUpdatedDto]);

export type GameStateDto = z.infer<typeof GameStateDto>;
export type ProgressUpdatedDto = z.infer<typeof ProgressUpdatedDto>;
export type ServerMessageDto = z.infer<typeof ServerMessageDto>;
