import { z } from 'zod';
import {
  AmbienceDto,
  AvatarDto,
  GroupNatureDto,
  LanguageDto,
  PlaceDto,
  PlayedDilemmaIdsDto,
} from '../client-messages.ts';

/** POST /rooms: whoever calls creates a room and becomes its host. Who calls comes from their token. */
export const CreateRoomRequestDto = z.strictObject({
  nickname: z.string().min(1),
  /** The ambience the host chose, which sets up the room. */
  ambience: AmbienceDto,
  /** The avatar the host chose before creating the room. */
  avatar: AvatarDto,
  groupNature: GroupNatureDto,
  place: PlaceDto,
  /** The language of the device, or of the dilemma of its first round, which the room takes. */
  dilemmaLanguage: LanguageDto,
  /** A dilemma of the general catalog in that language, for the first round, specific. */
  firstRoundDilemmaId: z.string().min(1).max(200).optional(),
  playedDilemmaIds: PlayedDilemmaIdsDto.optional(),
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
