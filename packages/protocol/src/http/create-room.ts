import { z } from 'zod';

/** POST /rooms: whoever calls creates a room and becomes its host. Who calls comes from their token. */
export const CreateRoomRequestDto = z.strictObject({ nickname: z.string().min(1) });

export const CreateRoomResponseDto = z.strictObject({
  roomId: z.string().min(1),
  /** The player of the host. */
  playerId: z.string().min(1),
});

export type CreateRoomRequestDto = z.infer<typeof CreateRoomRequestDto>;
export type CreateRoomResponseDto = z.infer<typeof CreateRoomResponseDto>;
