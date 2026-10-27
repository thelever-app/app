import { z } from 'zod';

/** POST /rooms/:roomId/players: whoever calls joins the room. Who calls comes from their token. */
export const JoinRoomRequestDto = z.strictObject({ nickname: z.string().min(1) });

export const JoinRoomResponseDto = z.strictObject({ playerId: z.string().min(1) });

export type JoinRoomRequestDto = z.infer<typeof JoinRoomRequestDto>;
export type JoinRoomResponseDto = z.infer<typeof JoinRoomResponseDto>;
