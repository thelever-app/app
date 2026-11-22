import type { Room } from '../../domain/entities/room.ts';
import { PlayerNotInRoomError } from '../../domain/errors/player-not-in-room.error.ts';
import { drawKey } from '../../domain/services/compose-game.ts';
import {
  type Ambience,
  type AmbienceOrCustom,
  ambienceOf,
  configurationOf,
} from '../../domain/vos/ambience.vo.ts';
import { ANY_CONTENT, type RoundContent } from '../../domain/vos/round.vo.ts';
import type { Place } from '../../domain/vos/group.vo.ts';
import type { Category } from '../../domain/vos/category.vo.ts';
import type { RoomSettingsSnapshot } from '../../domain/vos/room-settings.vo.ts';
import type { LobbyDilemma } from '../../domain/vos/round.vo.ts';
import type { DilemmaCatalog } from '../ports/dilemma-catalog.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';

export interface GetRoomStateInput {
  readonly roomId: string;
  /** The player who asks, who must be in the room. */
  readonly playerId: string;
  /** The language of the player, whom each dilemma is shown in it if it has a translation into it. */
  readonly language: string;
}

/** A dilemma of a round, with its text in the language of the player, if it has a translation. */
export interface LobbyRoundDilemma {
  readonly dilemmaId: string;
  readonly text: string;
  /** Whether it is about someone in the group, which needs more players than the game. */
  readonly hasGap: boolean;
}

/** A round as every player of the room sees it: never who chose the dilemma of a round of the players. */
export type LobbyRound =
  | {
      readonly roundId: number;
      readonly origin: 'random';
      readonly categories: readonly Category[] | null;
      readonly content: RoundContent;
      /**
       * In the lobby of a rematch, whether its categories have nothing left the room has not
       * played: if the game starts like that, the round plays from every category.
       */
      readonly withoutNewDilemmas: boolean;
    }
  | { readonly roundId: number; readonly origin: 'specific'; readonly dilemma: LobbyRoundDilemma }
  | {
      readonly roundId: number;
      readonly origin: 'players';
      readonly dilemma: LobbyRoundDilemma | null;
      /** Whether the player who asks chose it, so only they can take it out. */
      readonly chosenByYou: boolean;
    };

/**
 * What an ambience would set in the room, which choosing it in the settings fills in: its variant,
 * adults only, compromising dilemmas and its random rounds from every category, in order.
 */
export interface AmbienceSettings {
  readonly variant: RoomSettingsSnapshot['variant'];
  readonly adultsOnly: boolean;
  readonly compromisingDilemmas: boolean;
  readonly rounds: readonly {
    readonly origin: 'random';
    readonly categories: null;
    readonly content: RoundContent;
  }[];
}

export interface GetRoomStateOutput {
  readonly roomId: string;
  /** The version of the room this state was computed from. */
  readonly roomVersion: number;
  readonly code: string;
  readonly playerId: string;
  readonly hostId: string;
  readonly place: Place;
  /** Without the language, which is the room's own and nobody sees. */
  readonly settings: Omit<RoomSettingsSnapshot, 'rounds' | 'dilemmaLanguage'>;
  /** The ambience whose configuration the room has, or custom. */
  readonly ambience: AmbienceOrCustom;
  /**
   * For the host, whether someone in the room said they are under 18, which keeps out everything
   * for adults; false for the others, who need not know, so nobody can tell who it is.
   */
  readonly hasPlayerUnderEighteen: boolean;
  /**
   * For the host, what each ambience would set in the room, so the settings fill it in when they
   * choose it and the room only takes it when they save; null for the others.
   */
  readonly ambiences: Readonly<Record<Ambience, AmbienceSettings>> | null;
  /** The rounds of the game in the order it plays them. */
  readonly rounds: readonly LobbyRound[];
  /** The fewest players a game of the room starts with, by its variant: the screen counts what is missing. */
  readonly minimumPlayers: number;
  /** The fewest players a game of the room plays the dilemmas with the gap with, by its variant. */
  readonly minimumPlayersForTheGap: number;
  readonly players: readonly {
    readonly playerId: string;
    readonly nickname: string;
    readonly avatar: { readonly face: string; readonly color: string };
    readonly connected: boolean;
  }[];
  readonly currentGameId: string | null;
}

/** What a player of the room may know about it: who is in it, its settings and its rounds. */
export class GetRoomStateUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #dilemmaCatalog: DilemmaCatalog;

  constructor(roomRepository: RoomRepository, dilemmaCatalog: DilemmaCatalog) {
    this.#roomRepository = roomRepository;
    this.#dilemmaCatalog = dilemmaCatalog;
  }

  async execute({ roomId, playerId, language }: GetRoomStateInput): Promise<GetRoomStateOutput> {
    const room = await findRoom(this.#roomRepository, roomId);
    if (!room.hasPlayer(playerId)) throw new PlayerNotInRoomError(playerId);

    const texts = await this.#textsOf(
      room.roundDilemmaIds,
      room.settings.dilemmaLanguage,
      language,
    );
    const withText = ({ dilemmaId, hasGap }: LobbyDilemma): LobbyRoundDilemma => ({
      dilemmaId,
      text: texts.get(dilemmaId) ?? '',
      hasGap,
    });
    const {
      rounds,
      variant,
      adultsOnly,
      compromisingDilemmas,
      timePerDilemmaSeconds,
      newDilemmas,
    } = room.settings.toSnapshot();
    const settings = {
      variant,
      adultsOnly,
      compromisingDilemmas,
      timePerDilemmaSeconds,
      newDilemmas,
    };
    const left = await this.#dilemmasLeft(room);
    // The rounds of the same categories take what is left in turn: the ones beyond it have none.
    const taken = new Map<string, number>();
    const withoutNewDilemmas = (categories: readonly Category[] | null): boolean => {
      const key = drawKey(categories, ANY_CONTENT);
      const available = left.get(key);
      if (available === undefined) return false;
      const before = taken.get(key) ?? 0;
      taken.set(key, before + 1);
      return before >= available;
    };

    return {
      roomId: room.id,
      roomVersion: room.version,
      code: room.code,
      playerId,
      hostId: room.host.id,
      place: room.place,
      settings,
      ambience: ambienceOf(room.settings),
      hasPlayerUnderEighteen: playerId === room.host.id && room.hasPlayerUnderEighteen,
      ambiences: playerId === room.host.id ? ambienceSettings() : null,
      rounds: rounds.map((round): LobbyRound => {
        if (round.origin === 'random') {
          return {
            roundId: round.id,
            origin: 'random',
            categories: round.categories,
            content: round.content,
            withoutNewDilemmas: withoutNewDilemmas(round.categories),
          };
        }
        if (round.origin === 'specific') {
          return {
            roundId: round.id,
            origin: 'specific',
            dilemma: withText(round.dilemma),
          };
        }
        const chosen = room.chosenDilemmas.find(({ roundId }) => roundId === round.id);
        return {
          roundId: round.id,
          origin: 'players',
          dilemma: chosen ? withText(chosen) : null,
          chosenByYou: chosen?.playerId === playerId,
        };
      }),
      minimumPlayers: room.minimumPlayers,
      minimumPlayersForTheGap: room.minimumPlayersForTheGap,
      players: room.players.map((player) => ({
        playerId: player.id,
        nickname: player.nickname,
        avatar: { face: player.avatar.face, color: player.avatar.color },
        connected: room.isConnected(player.id),
      })),
      currentGameId: room.currentGameId,
    };
  }

  /**
   * In the lobby of a rematch, how many dilemmas the catalog has left for the categories of its
   * random rounds that the room has not played nor plays in another round, by their key, up to
   * as many as the rounds of those categories need.
   */
  async #dilemmasLeft(room: Room): Promise<Map<string, number>> {
    if (!room.isInLobby || room.playedDilemmaIds.length === 0) return new Map();
    const { settings } = room;
    const categorySets = new Map<
      string,
      { categories: readonly Category[] | null; rounds: number }
    >();
    for (const round of settings.rounds) {
      if (round.origin !== 'random') continue;
      const key = drawKey(round.categories, ANY_CONTENT);
      const rounds = (categorySets.get(key)?.rounds ?? 0) + 1;
      categorySets.set(key, { categories: round.categories, rounds });
    }
    const statuses = settings.newDilemmas
      ? (['in-catalog', 'in-exploration'] as const)
      : (['in-catalog'] as const);
    const counted = await Promise.all(
      [...categorySets].map(async ([key, { categories, rounds }]): Promise<[string, number]> => {
        const found = await Promise.all(
          statuses.map((status) =>
            this.#dilemmaCatalog.findCandidates({
              ...(categories && { categories }),
              maximumMinimumAge: settings.maximumMinimumAge,
              status,
              language: settings.dilemmaLanguage,
              includeCompromising: settings.compromisingDilemmas,
              count: rounds,
              includeGap: room.playsTheGap,
              excludedIds: [...room.playedDilemmaIds, ...room.roundDilemmaIds],
              content: ANY_CONTENT,
              playedBy: [],
            }),
          ),
        );
        return [key, new Set(found.flat().map(({ dilemmaId }) => dilemmaId)).size];
      }),
    );
    return new Map(counted);
  }

  /**
   * The text of each dilemma of the rounds the catalog still has in the language of the room, in the
   * language of the player if its current version has a translation into it.
   */
  async #textsOf(
    dilemmaIds: readonly string[],
    roomLanguage: string,
    language: string,
  ): Promise<Map<string, string>> {
    if (dilemmaIds.length === 0) return new Map();
    const { dilemmas: found } = await this.#dilemmaCatalog.search(
      // Whatever the room keeps, for adults and compromising ones too, which it already checked.
      {
        dilemmaIds,
        maximumMinimumAge: 18,
        status: 'in-catalog',
        language: roomLanguage,
        includeCompromising: true,
      },
      // One page with all of them: no more than were asked for.
      { size: dilemmaIds.length },
    );
    if (found.length === 0) return new Map();
    const versions = await this.#dilemmaCatalog.findOptionIds(
      found.map(({ dilemmaId }) => dilemmaId),
    );
    const contents = await this.#dilemmaCatalog.findContents(versions, language);
    return new Map(contents.map(({ dilemmaId, text }) => [dilemmaId, text]));
  }
}

function ambienceSettings(): Record<Ambience, AmbienceSettings> {
  const of = (ambience: Ambience): AmbienceSettings => {
    const { contents, ...configuration } = configurationOf(ambience);
    return {
      ...configuration,
      rounds: contents.map((content) => ({ origin: 'random', categories: null, content })),
    };
  };
  return { classic: of('classic'), spicy: of('spicy'), 'no-filter': of('no-filter') };
}
