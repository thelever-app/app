import { z } from 'zod';

/**
 * The version of this contract. Client and server agree on it once, when the connection opens.
 * 2 since App Check: a client of 1 could not read the error that turns it down. 3 since the lobby:
 * a connection is to a room, not to a game. 5 since the game by rounds: predictions, the time
 * per dilemma, the reveal of each dilemma, moving on, leaving and reporting.
 */
export const CONTRACT_VERSION = 5;

/**
 * Where the nickname of the person in the gap "someone in the group" goes, in the text of a
 * dilemma and of its options; the game state says who it is.
 */
export const GAP_MARKER = '{gap}';

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
  /**
   * Categories of Dilemmas, which Game does not know: null plays every category, and an empty
   * list none, so only the dilemmas the players add.
   */
  categories: z.array(z.string().min(1)).max(20).nullable(),
  dilemmaCount: z.union([z.literal(6), z.literal(8), z.literal(10), z.literal(12)]),
  timePerDilemmaSeconds: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90)]),
  /** Whether a game by categories keeps room for dilemmas in exploration. */
  newDilemmas: z.boolean(),
  /** How many dilemmas each player, the host too, may add in the lobby; none, and nobody adds any. */
  dilemmasPerPlayer: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
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
  /**
   * In a nominal room, the predictions made so far, sent again with every change: how many of the
   * others chose the same, and the vote of each player of the subset predicted.
   */
  matchPrediction: z.number().int().nonnegative().nullable().optional(),
  votePredictions: z
    .array(z.strictObject({ playerId: z.string().min(1), vote: z.string().min(1) }))
    .max(10)
    .optional(),
  traceparent: TraceparentDto.optional(),
});

/** The host reveals the dilemma of the round without waiting for everyone, at any moment of its decision phase. */
export const RevealEarlyDto = z.strictObject({
  type: z.literal('reveal-early'),
  traceparent: TraceparentDto.optional(),
});

/** From the reveal of a round, any player takes everyone to the next one. */
export const MoveOnDto = z.strictObject({
  type: z.literal('move-on'),
  /** The position of the round whose reveal the player moves on from, so two at once move one round. */
  fromPosition: z.number().int().nonnegative(),
  traceparent: TraceparentDto.optional(),
});

/** The player leaves the game in progress on purpose; they can join the room again. */
export const LeaveRoomDto = z.strictObject({
  type: z.literal('leave-room'),
  traceparent: TraceparentDto.optional(),
});

/** Why a player reports a dilemma; only an offensive one lets them skip it. */
export const ReportReasonDto = z.enum(['offensive', 'confusing', 'mistranslated', 'other']);

/** The player reports a dilemma of the game to Moderation, once. */
export const ReportDilemmaDto = z.strictObject({
  type: z.literal('report-dilemma'),
  dilemmaId: z.string().min(1),
  reason: ReportReasonDto,
  comment: z.string().max(280).optional(),
  traceparent: TraceparentDto.optional(),
});

/** The player skips the dilemma of the round, which they reported as offensive. */
export const SkipDilemmaDto = z.strictObject({
  type: z.literal('skip-dilemma'),
  dilemmaId: z.string().min(1),
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

/** The host picks the dilemmas of the game one by one; none, and the game goes by categories. */
export const PickDilemmasDto = z.strictObject({
  type: z.literal('pick-dilemmas'),
  dilemmaIds: z.array(z.string().min(1)).max(50),
  traceparent: TraceparentDto.optional(),
});

/** A player adds a dilemma of the catalog, up to as many as the host allows each one. */
export const AddDilemmaDto = z.strictObject({
  type: z.literal('add-dilemma'),
  dilemmaId: z.string().min(1),
  traceparent: TraceparentDto.optional(),
});

/** The host removes a dilemma a player added, without knowing who; a player, one they added. */
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
  RevealEarlyDto,
  MoveOnDto,
  LeaveRoomDto,
  ReportDilemmaDto,
  SkipDilemmaDto,
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
  'reveal-early',
  'move-on',
  'leave-room',
  'report-dilemma',
  'skip-dilemma',
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
export type RevealEarlyDto = z.infer<typeof RevealEarlyDto>;
export type MoveOnDto = z.infer<typeof MoveOnDto>;
export type LeaveRoomDto = z.infer<typeof LeaveRoomDto>;
export type ReportReasonDto = z.infer<typeof ReportReasonDto>;
export type ReportDilemmaDto = z.infer<typeof ReportDilemmaDto>;
export type SkipDilemmaDto = z.infer<typeof SkipDilemmaDto>;
export type ClientMessageDto = z.infer<typeof ClientMessageDto>;
export type ClientMessageTypeDto = z.infer<typeof ClientMessageTypeDto>;
