import { z } from 'zod';

/**
 * The version of this contract. Client and server agree on it once, when the connection opens.
 * 2 since App Check: a client of 1 could not read the error that turns it down. 3 since the lobby:
 * a connection is to a room, not to a game. 5 since the game by rounds: predictions, the time
 * per dilemma, the reveal of each dilemma, moving on, leaving and reporting. 6 since the avatar
 * before entering: an avatar is refused only to someone with the same nickname. 7 since joining
 * a game in progress: a dilemma already revealed when the player joined is "did not vote" too.
 * 8 since the rounds of the room. 9 since the distribution prediction: an answer of an anonymous
 * room carries it and Ready, and the game has its results and its end. 10 since the person in the
 * gap predicts without voting: their answer has no vote, nobody predicts them and the reveal says
 * how many votes they guessed. 11 since the end of the game: the results of a nominal room screen
 * by screen with their titles, reactions, likes, the cards and the rematch. 12 since taking back
 * a like: `unlike-dilemma`. 13 since the first access: nobody creates or joins a room before it,
 * and nobody under 18 joins a room for adults (`adults-only-room`). 14 since the ambiences: a
 * room is created with one, the host chooses another (`choose-ambience`), compromising dilemmas
 * and the content of each random round, nothing for adults with a minor in the room
 * (`minor-in-room`), and leaving the lobby.
 */
export const CONTRACT_VERSION = 14;

/**
 * Where the nickname of the person in the gap "someone in the group" goes, in the text of a
 * dilemma and of its options; the game state says who it is.
 */
export const GAP_MARKER = '{gap}';

/** The most dilemmas a device says its player played: more than the catalog will have for a while. */
export const MAXIMUM_PLAYED_DILEMMAS = 2000;

/**
 * The dilemmas of the catalog the device of the player played, which it sends on entering a room:
 * only to put the games together with, so the room does not play them again.
 */
export const PlayedDilemmaIdsDto = z.array(z.string().min(1).max(200)).max(MAXIMUM_PLAYED_DILEMMAS);

/** The languages a player can read the dilemmas in. */
export const LanguageDto = z.enum(['es', 'en', 'fr', 'de', 'it', 'pt', 'ca']);

/** The categories of the dilemmas, from the closed list of the glossary, in the order the screens offer them. */
export const CategoryDto = z.enum([
  'life-and-death',
  'honesty',
  'loyalty',
  'justice',
  'love-and-relationships',
  'work-and-money',
  'technology-and-the-future',
]);

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

/** The presets of a room: Classic, Spicy and No filter. */
export const AmbienceDto = z.enum(['classic', 'spicy', 'no-filter']);

/** The ambience whose configuration a room has, or custom. */
export const AmbienceOrCustomDto = z.enum([...AmbienceDto.options, 'custom']);

/** The configuration of a room apart from its rounds, which the game copies when it starts. */
export const RoomSettingsDto = z.strictObject({
  variant: z.enum(['nominal', 'anonymous']),
  adultsOnly: z.boolean(),
  /** Whether the games may include compromising dilemmas: only in an anonymous room. */
  compromisingDilemmas: z.boolean(),
  dilemmaLanguage: LanguageDto,
  timePerDilemmaSeconds: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90)]),
  /** Whether the random rounds keep room for dilemmas in exploration. */
  newDilemmas: z.boolean(),
});

/** The id of a round in its room, which it keeps when the host adds or removes others. */
export const RoundIdDto = z.number().int().positive().max(32_767);

/** A game plays from 1 to 12 rounds. */
export const MAXIMUM_ROUNDS = 12;

/** The categories of a random round: one, several or all; null, every one. */
export const RoundCategoriesDto = z
  .array(CategoryDto)
  .min(1)
  .max(CategoryDto.options.length)
  .nullable();

/** What a random round draws: any dilemma, only those for adults or only compromising ones. */
export const RoundContentDto = z.enum(['any', 'adults-only', 'compromising']);

/** A round as the host sets it, with where its dilemma comes from; one without an id is a new one. */
export const RoundSettingsDto = z.discriminatedUnion('origin', [
  z.strictObject({
    id: RoundIdDto.optional(),
    origin: z.literal('random'),
    categories: RoundCategoriesDto,
    content: RoundContentDto,
  }),
  z.strictObject({
    id: RoundIdDto.optional(),
    origin: z.literal('specific'),
    dilemmaId: z.string().min(1).max(200),
  }),
  z.strictObject({ id: RoundIdDto.optional(), origin: z.literal('players') }),
]);

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
 * In an anonymous room, the share of the group, in steps of 5 %, the player believes chose each
 * option of a dilemma, which add up to 100: one for each option, at most 4.
 */
export const DistributionPredictionDto = z
  .array(z.strictObject({ optionId: z.string().min(1), share: z.number().int().min(0).max(100) }))
  .min(2)
  .max(4);

/**
 * The player answers a dilemma, or changes an answer they already gave.
 * Who answers and in which game come from the connection, never from the message.
 */
export const AnswerDilemmaDto = z.strictObject({
  type: z.literal('answer-dilemma'),
  dilemmaId: z.string().min(1),
  /** Null for the person in the gap, who does not vote the dilemma about them. */
  vote: z.string().min(1).nullable(),
  /**
   * In a nominal room, the vote predictions made so far, sent again with every change: at most one
   * about each of the other players of a room of 50.
   */
  votePredictions: z
    .array(z.strictObject({ playerId: z.string().min(1), vote: z.string().min(1) }))
    .max(49)
    .optional(),
  distributionPrediction: DistributionPredictionDto.optional(),
  /** In an anonymous room, the player pressed Ready: the prediction is done. */
  ready: z.boolean().optional(),
  traceparent: TraceparentDto.optional(),
});

/** The host reveals the dilemma of the round without waiting for everyone, at any moment of its decision phase. */
export const RevealEarlyDto = z.strictObject({
  type: z.literal('reveal-early'),
  traceparent: TraceparentDto.optional(),
});

/**
 * From the reveal of a round, any player takes everyone to the next one; from the last one, to the
 * first screen of the game results; from each, to the next; and from the last, to the end of the game.
 */
export const MoveOnDto = z.strictObject({
  type: z.literal('move-on'),
  /**
   * The position of the round whose reveal the player moves on from or, from a screen of the game
   * results, the number of rounds plus the number of that screen, so two at once move one step.
   */
  fromPosition: z.number().int().nonnegative(),
  traceparent: TraceparentDto.optional(),
});

/** One emoji, any of them, as the keyboard of the phone writes it; the server checks it is one. */
export const EmojiDto = z.string().min(1).max(32);

/**
 * In the reveal of a round, the player reacts to its dilemma or, in a nominal room, to the vote of
 * a player, their own too; a new reaction to the same thing takes the place of the one before.
 */
export const ReactDto = z.strictObject({
  type: z.literal('react'),
  /** The position of the round whose reveal the player reacts in, so a late one is lost. */
  position: z.number().int().nonnegative(),
  target: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('dilemma') }),
    z.strictObject({ kind: z.literal('vote'), playerId: z.string().min(1) }),
  ]),
  emoji: EmojiDto,
  traceparent: TraceparentDto.optional(),
});

/** In the reveal of a round, the player gives «Buen dilema» to its dilemma, once in all. */
export const LikeDilemmaDto = z.strictObject({
  type: z.literal('like-dilemma'),
  position: z.number().int().nonnegative(),
  traceparent: TraceparentDto.optional(),
});

/** In the reveal of a round, the player takes back the «Buen dilema» they gave to its dilemma. */
export const UnlikeDilemmaDto = z.strictObject({
  type: z.literal('unlike-dilemma'),
  position: z.number().int().nonnegative(),
  traceparent: TraceparentDto.optional(),
});

/** Once the game has ended, the host takes who is still in the room to the lobby of a new one. */
export const StartRematchDto = z.strictObject({
  type: z.literal('start-rematch'),
  traceparent: TraceparentDto.optional(),
});

/**
 * The player leaves the room on purpose: from the game in progress, keeping their place, or from
 * the lobby, out of the room. Either way they can join it again.
 */
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

/** The player takes another avatar: any but one that someone with the same nickname has. */
export const ChangeAvatarDto = z.strictObject({
  type: z.literal('change-avatar'),
  face: AvatarFaceDto,
  color: PlayerColorDto,
  traceparent: TraceparentDto.optional(),
});

/** The host changes some of the configuration of the room, before the game starts. */
export const ChangeSettingsDto = z.strictObject({
  type: z.literal('change-settings'),
  /** Only what changes, the rounds whole; at least one part. */
  changes: RoomSettingsDto.partial()
    .extend({ rounds: z.array(RoundSettingsDto).min(1).max(MAXIMUM_ROUNDS).optional() })
    .refine((changes) => Object.keys(changes).length > 0),
  traceparent: TraceparentDto.optional(),
});

/** The host chooses an ambience, which sets up the room again, before the game starts. */
export const ChooseAmbienceDto = z.strictObject({
  type: z.literal('choose-ambience'),
  ambience: AmbienceDto,
  traceparent: TraceparentDto.optional(),
});

/** A player, the host too, chooses a dilemma of the catalog for an empty round of the players. */
export const ChooseRoundDilemmaDto = z.strictObject({
  type: z.literal('choose-round-dilemma'),
  roundId: RoundIdDto,
  dilemmaId: z.string().min(1).max(200),
  traceparent: TraceparentDto.optional(),
});

/** The player who chose the dilemma of a round of the players takes it out. */
export const ClearRoundDilemmaDto = z.strictObject({
  type: z.literal('clear-round-dilemma'),
  roundId: RoundIdDto,
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
  ChooseAmbienceDto,
  ChooseRoundDilemmaDto,
  ClearRoundDilemmaDto,
  ExpelPlayerDto,
  StartGameDto,
  RevealEarlyDto,
  MoveOnDto,
  LeaveRoomDto,
  ReportDilemmaDto,
  SkipDilemmaDto,
  ReactDto,
  LikeDilemmaDto,
  UnlikeDilemmaDto,
  StartRematchDto,
]);

/** The type of every message a player sends, so the server can say which one it rejected. */
export const ClientMessageTypeDto = z.enum([
  'connect',
  'answer-dilemma',
  'change-avatar',
  'change-settings',
  'choose-ambience',
  'choose-round-dilemma',
  'clear-round-dilemma',
  'expel-player',
  'start-game',
  'reveal-early',
  'move-on',
  'leave-room',
  'report-dilemma',
  'skip-dilemma',
  'react',
  'like-dilemma',
  'unlike-dilemma',
  'start-rematch',
]);

export type LanguageDto = z.infer<typeof LanguageDto>;
export type CategoryDto = z.infer<typeof CategoryDto>;
export type AvatarFaceDto = z.infer<typeof AvatarFaceDto>;
export type PlayerColorDto = z.infer<typeof PlayerColorDto>;
export type AvatarDto = z.infer<typeof AvatarDto>;
export type GroupNatureDto = z.infer<typeof GroupNatureDto>;
export type PlaceDto = z.infer<typeof PlaceDto>;
export type RoomSettingsDto = z.infer<typeof RoomSettingsDto>;
export type AmbienceDto = z.infer<typeof AmbienceDto>;
export type AmbienceOrCustomDto = z.infer<typeof AmbienceOrCustomDto>;
export type RoundContentDto = z.infer<typeof RoundContentDto>;
export type ChooseAmbienceDto = z.infer<typeof ChooseAmbienceDto>;
export type ChangeAvatarDto = z.infer<typeof ChangeAvatarDto>;
export type ChangeSettingsDto = z.infer<typeof ChangeSettingsDto>;
export type RoundSettingsDto = z.infer<typeof RoundSettingsDto>;
export type RoundCategoriesDto = z.infer<typeof RoundCategoriesDto>;
export type ChooseRoundDilemmaDto = z.infer<typeof ChooseRoundDilemmaDto>;
export type ClearRoundDilemmaDto = z.infer<typeof ClearRoundDilemmaDto>;
export type ExpelPlayerDto = z.infer<typeof ExpelPlayerDto>;
export type StartGameDto = z.infer<typeof StartGameDto>;
export type ConnectDto = z.infer<typeof ConnectDto>;
export type DistributionPredictionDto = z.infer<typeof DistributionPredictionDto>;
export type AnswerDilemmaDto = z.infer<typeof AnswerDilemmaDto>;
export type RevealEarlyDto = z.infer<typeof RevealEarlyDto>;
export type MoveOnDto = z.infer<typeof MoveOnDto>;
export type LeaveRoomDto = z.infer<typeof LeaveRoomDto>;
export type ReportReasonDto = z.infer<typeof ReportReasonDto>;
export type ReportDilemmaDto = z.infer<typeof ReportDilemmaDto>;
export type SkipDilemmaDto = z.infer<typeof SkipDilemmaDto>;
export type ReactDto = z.infer<typeof ReactDto>;
export type LikeDilemmaDto = z.infer<typeof LikeDilemmaDto>;
export type UnlikeDilemmaDto = z.infer<typeof UnlikeDilemmaDto>;
export type StartRematchDto = z.infer<typeof StartRematchDto>;
export type ClientMessageDto = z.infer<typeof ClientMessageDto>;
export type ClientMessageTypeDto = z.infer<typeof ClientMessageTypeDto>;
