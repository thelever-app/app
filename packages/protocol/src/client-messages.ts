import { z } from 'zod';

/**
 * The version of this contract. Client and server agree on it once, when the connection opens.
 * 2 since App Check: a client of 1 could not read the error that turns it down. 3 since the lobby:
 * a connection is to a room, not to a game.
 */
export const CONTRACT_VERSION = 3;

/** The languages a player can read the dilemmas in. */
export const LanguageDto = z.enum(['es', 'en', 'fr', 'de', 'it', 'pt', 'ca']);

/** The faces of the avatars, from a closed list; the web keeps how each one is drawn. */
export const AvatarFaceDto = z.enum([
  'face-01',
  'face-02',
  'face-03',
  'face-04',
  'face-05',
  'face-06',
  'face-07',
  'face-08',
  'face-09',
  'face-10',
  'face-11',
  'face-12',
]);

/** The colours of the players, the `player-*` colours of the design. */
export const PlayerColorDto = z.enum([
  'khaki',
  'teal',
  'brown',
  'slate',
  'cyan',
  'rust',
  'olive',
  'stone',
]);

/** A face and a colour: no two players of a room share both. */
export const AvatarDto = z.strictObject({ face: AvatarFaceDto, color: PlayerColorDto });

/** What relation the group has, chosen once when the room is created. */
export const GroupNatureDto = z.enum(['family', 'friends', 'work', 'mixed']);

/** Whether the group plays in the same place or remotely. */
export const PlaceDto = z.enum(['together', 'remote']);

/** The configuration of a room, which the game copies when it starts. */
export const RoomSettingsDto = z.strictObject({
  variant: z.enum(['nominal', 'anonymous']),
  adultsOnly: z.boolean(),
  dilemmaLanguage: LanguageDto,
  /** One of the categories of Dilemmas, which Game does not know. */
  category: z.string().min(1),
  dilemmaCount: z.union([z.literal(6), z.literal(8), z.literal(10), z.literal(12)]),
  totalTimeInMinutes: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(10)]),
  /** Whether a game by category keeps room for dilemmas in exploration. */
  newDilemmas: z.boolean(),
  playersCanAddDilemmas: z.boolean(),
});

/**
 * The W3C trace context of a command, so its trace starts on the device that sent it. Only ids
 * and the sampled flag: nothing else about the device travels with it.
 */
export const TraceparentDto = z.string().regex(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);

/**
 * The first message on every connection, and again after each reconnection.
 * Nothing travels in the URL, so the token never ends up in the request logs.
 */
export const ConnectDto = z.strictObject({
  type: z.literal('connect'),
  contractVersion: z.number().int().positive(),
  /** The Firebase ID token of the player. The server takes the player from it. */
  token: z.string().min(1),
  /** The Firebase App Check token of the device, the proof that it is the app; none locally. */
  appCheckToken: z.string().min(1).optional(),
  /** The room the player joined; its game in progress, if any, comes with it. */
  roomId: z.string().min(1),
  language: LanguageDto,
  traceparent: TraceparentDto.optional(),
});

/**
 * The player answers a dilemma, or changes an answer they already gave.
 * Who answers and in which game come from the connection, never from the message.
 */
export const AnswerDilemmaDto = z.strictObject({
  type: z.literal('answer-dilemma'),
  dilemmaId: z.string().min(1),
  vote: z.string().min(1),
  traceparent: TraceparentDto.optional(),
});

/** The player takes another avatar nobody else in the room has. */
export const ChangeAvatarDto = z.strictObject({
  type: z.literal('change-avatar'),
  face: AvatarFaceDto,
  color: PlayerColorDto,
  traceparent: TraceparentDto.optional(),
});

/** The host changes some of the configuration of the room, before the game starts. */
export const ChangeSettingsDto = z.strictObject({
  type: z.literal('change-settings'),
  /** Only what changes; at least one part. */
  changes: RoomSettingsDto.partial().refine((changes) => Object.keys(changes).length > 0),
  traceparent: TraceparentDto.optional(),
});

/** The host picks the dilemmas of the game one by one; none, and the game goes by category. */
export const PickDilemmasDto = z.strictObject({
  type: z.literal('pick-dilemmas'),
  dilemmaIds: z.array(z.string().min(1)).max(50),
  traceparent: TraceparentDto.optional(),
});

/** A player adds a dilemma of the catalog, if the host allows it; one per player. */
export const AddDilemmaDto = z.strictObject({
  type: z.literal('add-dilemma'),
  dilemmaId: z.string().min(1),
  traceparent: TraceparentDto.optional(),
});

/** The host removes a dilemma a player added, without knowing who. */
export const RemoveAddedDilemmaDto = z.strictObject({
  type: z.literal('remove-added-dilemma'),
  dilemmaId: z.string().min(1),
  traceparent: TraceparentDto.optional(),
});

/** The host expels a player from the lobby. */
export const ExpelPlayerDto = z.strictObject({
  type: z.literal('expel-player'),
  playerId: z.string().min(1),
  traceparent: TraceparentDto.optional(),
});

/** The host starts the game; the server puts it together. */
export const StartGameDto = z.strictObject({
  type: z.literal('start-game'),
  traceparent: TraceparentDto.optional(),
});

/** Every message a player sends to the room server. */
export const ClientMessageDto = z.discriminatedUnion('type', [
  ConnectDto,
  AnswerDilemmaDto,
  ChangeAvatarDto,
  ChangeSettingsDto,
  PickDilemmasDto,
  AddDilemmaDto,
  RemoveAddedDilemmaDto,
  ExpelPlayerDto,
  StartGameDto,
]);

/** The type of every message a player sends, so the server can say which one it rejected. */
export const ClientMessageTypeDto = z.enum([
  'connect',
  'answer-dilemma',
  'change-avatar',
  'change-settings',
  'pick-dilemmas',
  'add-dilemma',
  'remove-added-dilemma',
  'expel-player',
  'start-game',
]);

export type LanguageDto = z.infer<typeof LanguageDto>;
export type AvatarFaceDto = z.infer<typeof AvatarFaceDto>;
export type PlayerColorDto = z.infer<typeof PlayerColorDto>;
export type AvatarDto = z.infer<typeof AvatarDto>;
export type GroupNatureDto = z.infer<typeof GroupNatureDto>;
export type PlaceDto = z.infer<typeof PlaceDto>;
export type RoomSettingsDto = z.infer<typeof RoomSettingsDto>;
export type ChangeAvatarDto = z.infer<typeof ChangeAvatarDto>;
export type ChangeSettingsDto = z.infer<typeof ChangeSettingsDto>;
export type PickDilemmasDto = z.infer<typeof PickDilemmasDto>;
export type AddDilemmaDto = z.infer<typeof AddDilemmaDto>;
export type RemoveAddedDilemmaDto = z.infer<typeof RemoveAddedDilemmaDto>;
export type ExpelPlayerDto = z.infer<typeof ExpelPlayerDto>;
export type StartGameDto = z.infer<typeof StartGameDto>;
export type ConnectDto = z.infer<typeof ConnectDto>;
export type AnswerDilemmaDto = z.infer<typeof AnswerDilemmaDto>;
export type ClientMessageDto = z.infer<typeof ClientMessageDto>;
export type ClientMessageTypeDto = z.infer<typeof ClientMessageTypeDto>;
