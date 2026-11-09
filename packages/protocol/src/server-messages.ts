import { z } from 'zod';
import {
  AvatarDto,
  ClientMessageTypeDto,
  GroupNatureDto,
  PlaceDto,
  RoomSettingsDto,
} from './client-messages.ts';

/** Goes up with every change of the game. The client drops anything older than what it holds (ADR 0003). */
const GameVersionDto = z.number().int().nonnegative();

/** Goes up with every change of the room: who is connected and, in the lobby, everything it shows. Ordered apart from the game version. */
const RoomVersionDto = z.number().int().nonnegative();

/**
 * What the screen needs to draw the game: the round in progress and, once revealed, what its reveal
 * shows; who is playing and who answered the dilemma of the round (in an anonymous room, only how
 * many); and the answers of the player who receives it. Never the answers of anybody else before a
 * reveal, nor how long anyone took to answer.
 */
export const GameStateDto = z.strictObject({
  type: z.literal('game-state'),
  gameId: z.string().min(1),
  /** The version of the game this state was computed from. */
  gameVersion: GameVersionDto,
  /** The version of the connections of the room this state was computed from. */
  roomVersion: RoomVersionDto,
  /** The player who receives the message. */
  playerId: z.string().min(1),
  /** The round in progress: one dilemma, played by everyone at the same time. */
  round: z.strictObject({
    /** The position of its dilemma in the game, from 0. */
    position: z.number().int().nonnegative(),
    phase: z.enum(['decision', 'reveal']),
    /** When its time per dilemma runs out, by the clock of the server. */
    endsAt: z.iso.datetime(),
    /** What revealed the dilemma; null in its decision phase. */
    revealedBy: z.enum(['everyone', 'time', 'host']).nullable(),
    /** Who moved everyone on to this round from the reveal of the previous one; null for the first. */
    movedOnBy: z.string().min(1).nullable(),
  }),
  /** Who may reveal the dilemma of the round early now. */
  hostId: z.string().min(1),
  /** The time of the server when it sent this state, so the screen can correct its own clock. */
  serverTime: z.iso.datetime(),
  /** How many have answered the dilemma of the round; all an anonymous room tells about it. */
  answeredCount: z.number().int().nonnegative(),
  /** What the reveal of the dilemma of the round shows, once revealed; null in its decision phase. */
  reveal: z
    .strictObject({
      position: z.number().int().nonnegative(),
      dilemmaId: z.string().min(1),
      /** How many chose each option, in the order of the catalog; null when too few voted to show it. */
      distribution: z
        .array(
          z.strictObject({ optionId: z.string().min(1), count: z.number().int().nonnegative() }),
        )
        .nullable(),
      tooFewVotes: z.boolean(),
      didNotVoteCount: z.number().int().nonnegative(),
      /** What each player voted, null for who did not vote; empty in an anonymous room. */
      votes: z.array(
        z.strictObject({ playerId: z.string().min(1), vote: z.string().min(1).nullable() }),
      ),
      votePredictions: z.array(
        z.strictObject({
          playerId: z.string().min(1),
          aboutId: z.string().min(1),
          vote: z.string().min(1),
          right: z.boolean(),
        }),
      ),
      personInTheGap: z.string().min(1).nullable(),
      /** Who added it in the lobby, only in a nominal room. */
      addedBy: z.string().min(1).nullable(),
    })
    .nullable(),
  /** In the order every player gets them, in the language of the player. */
  dilemmas: z
    .array(
      z.strictObject({
        dilemmaId: z.string().min(1),
        /** With GAP_MARKER where the nickname of the person in the gap goes. */
        text: z.string().min(1),
        /** In the order this player sees them. A vote is the optionId of one of them. */
        options: z
          .array(z.strictObject({ optionId: z.string().min(1), text: z.string().min(1) }))
          .min(1),
        /** Who takes the gap "someone in the group", the same for everyone; null without it. */
        personInTheGap: z.string().min(1).nullable(),
      }),
    )
    .min(1),
  /** The players whose vote this player predicts in each dilemma: every other one, none in an anonymous room. */
  playersToPredict: z.array(z.string().min(1)),
  players: z
    .array(
      z.strictObject({
        playerId: z.string().min(1),
        nickname: z.string().min(1),
        avatar: AvatarDto,
        /** Whether they answered the dilemma of the round; null in an anonymous room, which never tells who. */
        answered: z.boolean().nullable(),
        /** False while the player has no open connection: the others see them as disconnected. */
        connected: z.boolean(),
        /** Left the game on purpose: nobody waits for them. */
        left: z.boolean(),
      }),
    )
    .min(1),
  /** Only the answers of the player who receives the message, complete or not yet. */
  answers: z.array(
    z.strictObject({
      dilemmaId: z.string().min(1),
      vote: z.string().min(1),
      votePredictions: z.array(
        z.strictObject({ playerId: z.string().min(1), vote: z.string().min(1) }),
      ),
    }),
  ),
  /** The dilemmas the player who receives the message reported; as offensive, they may skip it. */
  reports: z.array(z.strictObject({ dilemmaId: z.string().min(1), offensive: z.boolean() })),
  /** The dilemmas the player who receives the message is recorded as "did not vote" for. */
  didNotVote: z.array(
    z.strictObject({
      dilemmaId: z.string().min(1),
      reason: z.enum(['not-answered', 'reported']),
    }),
  ),
});

/** A dilemma added or picked in the lobby, in the language of the room. Never who added it. */
const LobbyDilemmaDto = z.strictObject({ dilemmaId: z.string().min(1), text: z.string() });

/**
 * What the screen needs to draw the lobby, as the player who receives it may see it: sent when
 * they connect while there is no game, and again after every change of the lobby.
 */
export const RoomStateDto = z.strictObject({
  type: z.literal('room-state'),
  roomId: z.string().min(1),
  /** The version of the room this state was computed from. */
  roomVersion: RoomVersionDto,
  code: z.string().length(5),
  /** The player who receives the message. */
  playerId: z.string().min(1),
  hostId: z.string().min(1),
  groupNature: GroupNatureDto,
  place: PlaceDto,
  settings: RoomSettingsDto,
  /** The fewest players a game of the room starts with, by its variant: 2 nominal, 3 anonymous. */
  minimumPlayers: z.number().int().positive(),
  /** In the order they entered. */
  players: z
    .array(
      z.strictObject({
        playerId: z.string().min(1),
        nickname: z.string().min(1),
        avatar: AvatarDto,
        connected: z.boolean(),
      }),
    )
    .min(1),
  addedDilemmas: z.array(LobbyDilemmaDto),
  /** The ones the player who receives the message added, so they can tell them apart; only theirs. */
  ownAddedDilemmaIds: z.array(z.string().min(1)),
  pickedDilemmas: z.array(LobbyDilemmaDto),
  /** Once the game starts, the player gets its state instead. */
  currentGameId: z.string().min(1).nullable(),
});

/** The host expelled the player who receives it: they are no longer in the room. */
export const ExpelledDto = z.strictObject({ type: z.literal('expelled') });

/** In a nominal room, another player answered the dilemma of the round. It never carries what they answered. */
export const PlayerAnsweredDto = z.strictObject({
  type: z.literal('player-answered'),
  /** The version of the game after this answer. */
  gameVersion: GameVersionDto,
  playerId: z.string().min(1),
});

/** In an anonymous room, one more player answered the dilemma of the round. Never who. */
export const AnsweredCountDto = z.strictObject({
  type: z.literal('answered-count'),
  /** The version of the game after this answer. */
  gameVersion: GameVersionDto,
  answeredCount: z.number().int().nonnegative(),
});

/** Another player disconnected or reconnected. */
export const ConnectionChangedDto = z.strictObject({
  type: z.literal('connection-changed'),
  /** The version of the connections of the room after this change. */
  roomVersion: RoomVersionDto,
  playerId: z.string().min(1),
  connected: z.boolean(),
});

/**
 * Why the server rejected a message. Stable codes, taken from the domain errors;
 * the client turns them into text, the server never sends text for the screen.
 */
export const ErrorCodeDto = z.enum([
  'invalid-message',
  'unsupported-contract-version',
  'not-connected',
  'invalid-token',
  'invalid-app-check',
  'room-not-found',
  'room-code-not-found',
  'game-not-found',
  'player-not-in-room',
  'player-not-in-game',
  'not-host',
  'game-in-progress',
  'room-full',
  'player-expelled',
  'host-cannot-be-expelled',
  'nickname-and-avatar-taken',
  'not-enough-players',
  'adding-dilemmas-not-allowed',
  'too-many-added-dilemmas',
  'dilemma-not-suitable',
  'invalid-avatar',
  'invalid-room-setting',
  'decision-phase-not-started',
  'dilemma-not-in-game',
  'dilemma-not-in-round',
  'dilemma-not-revealed',
  'no-next-round',
  'player-left',
  'option-not-in-dilemma',
  'dilemma-not-found',
  'nickname-missing',
  'duplicate-dilemma',
  'dilemmas-missing',
  'game-not-in-progress',
  'decision-phase-over',
  'vote-missing',
  'predictions-not-allowed',
  'player-not-predictable',
  'duplicate-vote-prediction',
  'answer-incomplete',
  'dilemma-skipped',
  'dilemma-already-reported',
  'dilemma-not-reported-as-offensive',
]);

/** The answer to a rejected message, on the same connection. */
export const ErrorDto = z.strictObject({
  type: z.literal('error'),
  /** The type of the rejected message, or null when the message could not even be read. */
  command: ClientMessageTypeDto.nullable(),
  code: ErrorCodeDto,
});

/** Every message the room server sends to a player. */
export const ServerMessageDto = z.discriminatedUnion('type', [
  RoomStateDto,
  ExpelledDto,
  GameStateDto,
  PlayerAnsweredDto,
  AnsweredCountDto,
  ConnectionChangedDto,
  ErrorDto,
]);

export type RoomStateDto = z.infer<typeof RoomStateDto>;
export type ExpelledDto = z.infer<typeof ExpelledDto>;
export type GameStateDto = z.infer<typeof GameStateDto>;
export type PlayerAnsweredDto = z.infer<typeof PlayerAnsweredDto>;
export type AnsweredCountDto = z.infer<typeof AnsweredCountDto>;
export type ConnectionChangedDto = z.infer<typeof ConnectionChangedDto>;
export type ErrorCodeDto = z.infer<typeof ErrorCodeDto>;
export type ErrorDto = z.infer<typeof ErrorDto>;
export type ServerMessageDto = z.infer<typeof ServerMessageDto>;
