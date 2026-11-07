import { PlayerNotInRoomError } from '../../domain/errors/player-not-in-room.error.ts';
import type { GroupNature, Place } from '../../domain/vos/group.vo.ts';
import type { RoomSettingsSnapshot } from '../../domain/vos/room-settings.vo.ts';
import type { DilemmaCatalog } from '../ports/dilemma-catalog.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';

export interface GetRoomStateInput {
  readonly roomId: string;
  /** The player who asks, who must be in the room. */
  readonly playerId: string;
}

export interface GetRoomStateOutput {
  readonly roomId: string;
  /** The version of the room this state was computed from. */
  readonly roomVersion: number;
  readonly code: string;
  readonly playerId: string;
  readonly hostId: string;
  readonly groupNature: GroupNature;
  readonly place: Place;
  readonly settings: RoomSettingsSnapshot;
  /** The fewest players a game of the room starts with, by its variant: the screen counts what is missing. */
  readonly minimumPlayers: number;
  readonly players: readonly {
    readonly playerId: string;
    readonly nickname: string;
    readonly avatar: { readonly face: string; readonly color: string };
    readonly connected: boolean;
  }[];
  /** Never who added each one, not even to the host. */
  readonly addedDilemmas: readonly { readonly dilemmaId: string; readonly text: string }[];
  /** The one the player who asks added, if any, so they know they cannot add another. */
  readonly ownAddedDilemmaId: string | null;
  readonly pickedDilemmas: readonly { readonly dilemmaId: string; readonly text: string }[];
  readonly currentGameId: string | null;
}

/** What a player of the room may know about it: who is in it, its settings and the dilemmas chosen. */
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

    const texts = await this.#textsOf(
      [...room.addedDilemmas, ...room.pickedDilemmas].map(({ dilemmaId }) => dilemmaId),
      room.settings.dilemmaLanguage,
    );
    const withText = (dilemmaId: string): { dilemmaId: string; text: string } => ({
      dilemmaId,
      text: texts.get(dilemmaId) ?? '',
    });

    return {
      roomId: room.id,
      roomVersion: room.version,
      code: room.code,
      playerId,
      hostId: room.host.id,
      groupNature: room.groupNature,
      place: room.place,
      settings: room.settings.toSnapshot(),
      minimumPlayers: room.minimumPlayers,
      players: room.players.map((player) => ({
        playerId: player.id,
        nickname: player.nickname,
        avatar: { face: player.avatar.face, color: player.avatar.color },
        connected: room.isConnected(player.id),
      })),
      addedDilemmas: room.addedDilemmas.map(({ dilemmaId }) => withText(dilemmaId)),
      ownAddedDilemmaId:
        room.addedDilemmas.find((added) => added.playerId === playerId)?.dilemmaId ?? null,
      pickedDilemmas: room.pickedDilemmas.map(({ dilemmaId }) => withText(dilemmaId)),
      currentGameId: room.currentGameId,
    };
  }

  async #textsOf(dilemmaIds: readonly string[], language: string): Promise<Map<string, string>> {
    if (dilemmaIds.length === 0) return new Map();
    const found = await this.#dilemmaCatalog.search({
      dilemmaIds,
      maximumMinimumAge: 18,
      status: 'in-catalog',
      language,
    });
    return new Map(found.map(({ dilemmaId, text }) => [dilemmaId, text]));
  }
}
