import { z } from 'zod';
import { AvatarDto, RoomSettingsDto } from '../client-messages.ts';

/** GET /rooms/by-code/:code: what a player sees of a room before entering it. */
export const RoomPreviewResponseDto = z.strictObject({
  roomId: z.string().min(1),
  hostNickname: z.string().min(1),
  variant: RoomSettingsDto.shape.variant,
  adultsOnly: z.boolean(),
  /** Who else is inside, in the order they came in, without their ids or identities; none if alone. */
  players: z.array(z.strictObject({ nickname: z.string().min(1), avatar: AvatarDto })),
  /** An avatar nobody inside has, for whoever is about to join. */
  suggestedAvatar: AvatarDto,
});

export type RoomPreviewResponseDto = z.infer<typeof RoomPreviewResponseDto>;
