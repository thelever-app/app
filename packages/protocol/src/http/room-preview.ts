import { z } from 'zod';
import { RoomSettingsDto } from '../client-messages.ts';

/** GET /rooms/by-code/:code: what a player sees of a room before entering it. */
export const RoomPreviewResponseDto = z.strictObject({
  roomId: z.string().min(1),
  hostNickname: z.string().min(1),
  variant: RoomSettingsDto.shape.variant,
  adultsOnly: z.boolean(),
  playerCount: z.number().int().positive(),
});

export type RoomPreviewResponseDto = z.infer<typeof RoomPreviewResponseDto>;
