import { z } from 'zod';
import { AvatarDto, GroupNatureDto, LanguageDto, PlaceDto } from '../client-messages.ts';

/** POST /rooms: whoever calls creates a room and becomes its host. Who calls comes from their token. */
export const CreateRoomRequestDto = z.strictObject({
  nickname: z.string().min(1),
  /** The avatar the host chose before creating the room. */
  avatar: AvatarDto,
  groupNature: GroupNatureDto,
  place: PlaceDto,
  /** The language of the device, which the room takes for its dilemmas. */
  dilemmaLanguage: LanguageDto,
});

export const CreateRoomResponseDto = z.strictObject({
  roomId: z.string().min(1),
  /** The 5 characters the others join with. */
  code: z.string().length(5),
  /** The player of the host. */
  playerId: z.string().min(1),
});

export type CreateRoomRequestDto = z.infer<typeof CreateRoomRequestDto>;
export type CreateRoomResponseDto = z.infer<typeof CreateRoomResponseDto>;
