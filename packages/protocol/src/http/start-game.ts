import { z } from 'zod';

/** POST /rooms/:roomId/games: starts a game in the decision phase. */
export const StartGameRequestDto = z.strictObject({
  /** In the order every player gets them. */
  dilemmaIds: z.array(z.string().min(1)).min(1),
});

export const StartGameResponseDto = z.strictObject({ gameId: z.string().min(1) });

export type StartGameRequestDto = z.infer<typeof StartGameRequestDto>;
export type StartGameResponseDto = z.infer<typeof StartGameResponseDto>;
