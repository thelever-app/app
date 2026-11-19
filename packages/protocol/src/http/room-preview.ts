import { z } from 'zod';
import { AmbienceOrCustomDto, AvatarDto, RoomSettingsDto } from '../client-messages.ts';

/** GET /rooms/by-code/:code: what a player sees of a room before entering it. */
export const RoomPreviewResponseDto = z.strictObject({
  roomId: z.string().min(1),
  /** The ambience whose configuration the room has, or custom. */
  ambience: AmbienceOrCustomDto,
  hostNickname: z.string().min(1),
  /** Who invites, as the welcome of a new device shows them. */
  hostAvatar: AvatarDto,
  variant: RoomSettingsDto.shape.variant,
  adultsOnly: z.boolean(),
  compromisingDilemmas: z.boolean(),
  /** Who else is inside, in the order they came in, without their ids or identities; none if alone. */
  players: z.array(z.strictObject({ nickname: z.string().min(1), avatar: AvatarDto })),
  /** An avatar nobody inside has, for whoever is about to join. */
  suggestedAvatar: AvatarDto,
});

export type RoomPreviewResponseDto = z.infer<typeof RoomPreviewResponseDto>;
