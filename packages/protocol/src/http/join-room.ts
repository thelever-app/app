import { z } from 'zod';
import { AvatarDto } from '../client-messages.ts';

/** POST /rooms/:roomId/players: whoever calls joins the room. Who calls comes from their token. */
export const JoinRoomRequestDto = z.strictObject({
  nickname: z.string().min(1),
  /** The avatar the player chose before entering. */
  avatar: AvatarDto,
});

export const JoinRoomResponseDto = z.strictObject({
  playerId: z.string().min(1),
  /** Whether joining took the player into a game in progress, which the screen tells them. */
  joinedLate: z.boolean(),
});

export type JoinRoomRequestDto = z.infer<typeof JoinRoomRequestDto>;
export type JoinRoomResponseDto = z.infer<typeof JoinRoomResponseDto>;
