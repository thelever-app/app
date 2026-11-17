import { PlayerNotInRoomError } from '../../domain/errors/player-not-in-room.error.ts';
import type { GroupNature, Place } from '../../domain/vos/group.vo.ts';
import type { Category } from '../../domain/vos/category.vo.ts';
import type { RoomSettingsSnapshot } from '../../domain/vos/room-settings.vo.ts';
import type { DilemmaCatalog } from '../ports/dilemma-catalog.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';

export interface GetRoomStateInput {
  readonly roomId: string;
  /** The player who asks, who must be in the room. */
  readonly playerId: string;
}

/** A dilemma of a round, with its text in the language of the room. */
export interface LobbyRoundDilemma {
  readonly dilemmaId: string;
  readonly text: string;
}

/** A round as every player of the room sees it: never who chose the dilemma of a round of the players. */
export type LobbyRound =
  | {
      readonly roundId: number;
      readonly origin: 'random';
      readonly categories: readonly Category[] | null;
    }
  | { readonly roundId: number; readonly origin: 'specific'; readonly dilemma: LobbyRoundDilemma }
  | {
      readonly roundId: number;
      readonly origin: 'players';
      readonly dilemma: LobbyRoundDilemma | null;
      /** Whether the player who asks chose it, so only they can take it out. */
      readonly chosenByYou: boolean;
    };

export interface GetRoomStateOutput {
  readonly roomId: string;
  /** The version of the room this state was computed from. */
  readonly roomVersion: number;
  readonly code: string;
  readonly playerId: string;
  readonly hostId: string;
  readonly groupNature: GroupNature;
  readonly place: Place;
  readonly settings: Omit<RoomSettingsSnapshot, 'rounds'>;
  /** The rounds of the game in the order it plays them. */
  readonly rounds: readonly LobbyRound[];
  /** The fewest players a game of the room starts with, by its variant: the screen counts what is missing. */
  readonly minimumPlayers: number;
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

  async execute({ roomId, playerId }: GetRoomStateInput): Promise<GetRoomStateOutput> {
    const room = await findRoom(this.#roomRepository, roomId);
    if (!room.hasPlayer(playerId)) throw new PlayerNotInRoomError(playerId);

    const texts = await this.#textsOf(room.roundDilemmaIds, room.settings.dilemmaLanguage);
    const withText = (dilemmaId: string): LobbyRoundDilemma => ({
      dilemmaId,
      text: texts.get(dilemmaId) ?? '',
    });
    const { rounds, ...settings } = room.settings.toSnapshot();

    return {
      roomId: room.id,
      roomVersion: room.version,
      code: room.code,
      playerId,
      hostId: room.host.id,
      groupNature: room.groupNature,
      place: room.place,
      settings,
      rounds: rounds.map((round): LobbyRound => {
        if (round.origin === 'random') {
          return { roundId: round.id, origin: 'random', categories: round.categories };
        }
        if (round.origin === 'specific') {
          return {
            roundId: round.id,
            origin: 'specific',
            dilemma: withText(round.dilemma.dilemmaId),
          };
        }
        const chosen = room.chosenDilemmas.find(({ roundId }) => roundId === round.id);
        return {
          roundId: round.id,
          origin: 'players',
          dilemma: chosen ? withText(chosen.dilemmaId) : null,
          chosenByYou: chosen?.playerId === playerId,
        };
      }),
      minimumPlayers: room.minimumPlayers,
      players: room.players.map((player) => ({
        playerId: player.id,
        nickname: player.nickname,
        avatar: { face: player.avatar.face, color: player.avatar.color },
        connected: room.isConnected(player.id),
      })),
      currentGameId: room.currentGameId,
    };
  }

  async #textsOf(dilemmaIds: readonly string[], language: string): Promise<Map<string, string>> {
    if (dilemmaIds.length === 0) return new Map();
    const { dilemmas: found } = await this.#dilemmaCatalog.search(
      // Whatever the room keeps, for adults and compromising ones too, which it already checked.
      {
        dilemmaIds,
        maximumMinimumAge: 18,
        status: 'in-catalog',
        language,
        includeCompromising: true,
      },
      // One page with all of them: no more than were asked for.
      { size: dilemmaIds.length },
    );
    return new Map(found.map(({ dilemmaId, text }) => [dilemmaId, text]));
  }
}
