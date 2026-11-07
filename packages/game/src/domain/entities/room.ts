import { AddingDilemmasNotAllowedError } from '../errors/adding-dilemmas-not-allowed.error.ts';
import { AvatarTakenError } from '../errors/avatar-taken.error.ts';
import { DilemmaAlreadyAddedError } from '../errors/dilemma-already-added.error.ts';
import { DilemmaNotSuitableError } from '../errors/dilemma-not-suitable.error.ts';
import { DuplicateDilemmaError } from '../errors/duplicate-dilemma.error.ts';
import { GameInProgressError } from '../errors/game-in-progress.error.ts';
import { HostCannotBeExpelledError } from '../errors/host-cannot-be-expelled.error.ts';
import { HostMissingError } from '../errors/host-missing.error.ts';
import { NotEnoughPlayersError } from '../errors/not-enough-players.error.ts';
import { NotHostError } from '../errors/not-host.error.ts';
import { PlayerExpelledError } from '../errors/player-expelled.error.ts';
import { PlayerNotInRoomError } from '../errors/player-not-in-room.error.ts';
import { RoomFullError } from '../errors/room-full.error.ts';
import { ConnectionChangedEvent } from '../events/connection-changed.event.ts';
import type { DomainEvent } from '../events/domain-event.ts';
import { LobbyChangedEvent, type LobbyChange } from '../events/lobby-changed.event.ts';
import type { IdGenerator } from '../ports/id-generator.port.ts';
import type { Randomness } from '../ports/randomness.port.ts';
import { pickOne } from '../services/random-choice.ts';
import { AvatarVO } from '../vos/avatar.vo.ts';
import { toGroupNature, toPlace, type GroupNature, type Place } from '../vos/group.vo.ts';
import { IdVO } from '../vos/id.vo.ts';
import { RoomCodeVO } from '../vos/room-code.vo.ts';
import {
  RoomSettingsVO,
  type RoomSettingsSnapshot,
  type RoomVariant,
} from '../vos/room-settings.vo.ts';
import { Player, type PlayerSnapshot } from './player.ts';

/**
 * The fewest players a game starts with. With two in an anonymous room, the distribution of the
 * votes in the reveal would tell each one what the other voted.
 */
export const MINIMUM_PLAYERS: Readonly<Record<RoomVariant, number>> = { nominal: 2, anonymous: 3 };
export const MAXIMUM_PLAYERS = 50;

/** A dilemma of the catalog, as the lobby needs it: to check that it suits the room. */
export interface LobbyDilemma {
  readonly dilemmaId: string;
  readonly minimumAge: 16 | 18;
}

/** A dilemma a player added in the lobby. Who added it stays in the room until the reveal. */
export interface AddedDilemma extends LobbyDilemma {
  readonly playerId: string;
}

export interface RoomSnapshot {
  readonly id: string;
  readonly code: string;
  readonly hostId: string;
  readonly groupNature: GroupNature;
  readonly place: Place;
  readonly settings: RoomSettingsSnapshot;
  readonly players: readonly PlayerSnapshot[];
  readonly version: number;
  /** Every open connection of each connected player. */
  readonly connections: readonly { readonly playerId: string; readonly connectionId: string }[];
  /** Who was expelled from the game the lobby is getting ready. */
  readonly expelledIdentities: readonly string[];
  readonly addedDilemmas: readonly AddedDilemma[];
  /** The dilemmas the host picked one by one; none, and the game is put together by category. */
  readonly pickedDilemmas: readonly LobbyDilemma[];
  readonly currentGameId: string | null;
}

export interface CreateRoomProps {
  readonly hostNickname: string;
  readonly hostIdentity: string;
  readonly groupNature: string;
  readonly place: string;
  /** The language of the device of the host, which the dilemmas use until the host changes it. */
  readonly dilemmaLanguage: string;
  /** Unique among the open rooms, which the room cannot know. */
  readonly code: string;
}

export class Room {
  readonly #id: IdVO;
  readonly #code: RoomCodeVO;
  readonly #host: Player;
  readonly #groupNature: GroupNature;
  readonly #place: Place;
  #settings: RoomSettingsVO;
  /** In the order they joined, which decides who takes over as host. */
  readonly #players: Player[];
  /** Goes up with every change the players of the room see, apart from the version of the game. */
  #version = 0;
  /** The ids of the open connections of each player; a player without any is disconnected. */
  readonly #connections = new Map<string, Set<string>>();
  readonly #expelledIdentities = new Set<string>();
  #addedDilemmas: AddedDilemma[] = [];
  #pickedDilemmas: LobbyDilemma[] = [];
  #currentGameId: IdVO | null = null;
  #events: DomainEvent[] = [];

  private constructor(
    snapshot: {
      readonly id: string;
      readonly code: string;
      readonly groupNature: string;
      readonly place: string;
      readonly settings: RoomSettingsSnapshot;
    },
    host: Player,
    players: readonly Player[],
  ) {
    this.#id = new IdVO(snapshot.id);
    this.#code = new RoomCodeVO(snapshot.code);
    this.#groupNature = toGroupNature(snapshot.groupNature);
    this.#place = toPlace(snapshot.place);
    this.#settings = new RoomSettingsVO(snapshot.settings);
    this.#host = host;
    this.#players = [...players];
  }

  /** The room is born with its host, who is its first player, and the default settings. */
  static create(props: CreateRoomProps, idGenerator: IdGenerator, randomness: Randomness): Room {
    const id = idGenerator.generate();
    const settings = RoomSettingsVO.defaults(props.dilemmaLanguage).toSnapshot();
    const host = Player.create(
      {
        nickname: props.hostNickname,
        identity: props.hostIdentity,
        avatar: pickOne(AvatarVO.all(), randomness),
      },
      idGenerator,
    );
    const { code, groupNature, place } = props;
    return new Room({ id, code, groupNature, place, settings }, host, [host]);
  }

  get id(): string {
    return this.#id.value;
  }

  get code(): string {
    return this.#code.value;
  }

  get host(): Player {
    return this.#host;
  }

  get groupNature(): GroupNature {
    return this.#groupNature;
  }

  get place(): Place {
    return this.#place;
  }

  get settings(): RoomSettingsVO {
    return this.#settings;
  }

  get players(): readonly Player[] {
    return [...this.#players];
  }

  get version(): number {
    return this.#version;
  }

  get addedDilemmas(): readonly AddedDilemma[] {
    return [...this.#addedDilemmas];
  }

  get pickedDilemmas(): readonly LobbyDilemma[] {
    return [...this.#pickedDilemmas];
  }

  get currentGameId(): string | null {
    return this.#currentGameId?.value ?? null;
  }

  /** Without a game in progress, the room is in the lobby. */
  get isInLobby(): boolean {
    return this.#currentGameId === null;
  }

  /**
   * A new player joins with a random avatar nobody in the room has. Whoever is already in the room
   * gets their player back, so joining twice changes nothing.
   */
  join(
    { nickname, identity }: { readonly nickname: string; readonly identity: string },
    idGenerator: IdGenerator,
    randomness: Randomness,
  ): Player {
    const existing = this.playerWith(identity);
    if (existing) return existing;
    if (this.#expelledIdentities.has(identity)) throw new PlayerExpelledError(this.id);
    if (this.#players.length >= MAXIMUM_PLAYERS) throw new RoomFullError(this.id);

    const free = AvatarVO.all().filter((avatar) => !this.#isWorn(avatar));
    const player = Player.create(
      { nickname, identity, avatar: pickOne(free, randomness) },
      idGenerator,
    );
    this.#players.push(player);
    this.#changeLobby('player-joined');
    return player;
  }

  hasPlayer(playerId: string): boolean {
    return this.#players.some((player) => player.id === playerId);
  }

  /** The player of the room behind that identity, if any. */
  playerWith(identity: string): Player | undefined {
    return this.#players.find((player) => player.identity === identity);
  }

  /** The player changes to an avatar nobody else in the room has. */
  changeAvatar(playerId: string, avatar: AvatarVO): void {
    const player = this.#player(playerId);
    if (player.avatar.equals(avatar)) return;
    if (this.#isWorn(avatar)) throw new AvatarTakenError(avatar.face, avatar.color);

    player.wear(avatar);
    this.#changeLobby('avatar-changed');
  }

  /** Only the host, and only in the lobby. Dilemmas that no longer suit the room are dropped. */
  changeSettings(playerId: string, changes: Partial<RoomSettingsSnapshot>): void {
    this.#ensureHostInLobby(playerId);

    this.#settings = this.#settings.with(changes);
    const suits = (dilemma: LobbyDilemma): boolean => this.#suits(dilemma);
    this.#addedDilemmas = this.#addedDilemmas.filter(suits);
    this.#pickedDilemmas = this.#pickedDilemmas.filter(suits);
    this.#changeLobby('settings-changed');
  }

  /** The host picks the dilemmas of the game one by one; picking none goes back to the category. */
  pickDilemmas(playerId: string, dilemmas: readonly LobbyDilemma[]): void {
    this.#ensureHostInLobby(playerId);
    const ids = dilemmas.map(({ dilemmaId }) => dilemmaId);
    const repeated = ids.find((dilemmaId, index) => ids.indexOf(dilemmaId) !== index);
    if (repeated !== undefined) throw new DuplicateDilemmaError(repeated);
    const unsuitable = dilemmas.find((dilemma) => !this.#suits(dilemma));
    if (unsuitable) throw new DilemmaNotSuitableError(unsuitable.dilemmaId);

    this.#pickedDilemmas = dilemmas.map(({ dilemmaId, minimumAge }) => ({ dilemmaId, minimumAge }));
    this.#changeLobby('dilemmas-changed');
  }

  /** When the host allows it, each player adds one dilemma that suits the room. */
  addDilemma(playerId: string, dilemma: LobbyDilemma): void {
    this.#player(playerId);
    if (!this.isInLobby) throw new GameInProgressError(this.id);
    if (!this.#settings.playersCanAddDilemmas) throw new AddingDilemmasNotAllowedError(this.id);
    if (this.#addedDilemmas.some((added) => added.playerId === playerId)) {
      throw new DilemmaAlreadyAddedError(playerId);
    }
    if (this.#addedDilemmas.some((added) => added.dilemmaId === dilemma.dilemmaId)) {
      throw new DuplicateDilemmaError(dilemma.dilemmaId);
    }
    if (!this.#suits(dilemma)) throw new DilemmaNotSuitableError(dilemma.dilemmaId);

    this.#addedDilemmas.push({ ...dilemma, playerId });
    this.#changeLobby('dilemmas-changed');
  }

  /** The host removes a dilemma a player added, without knowing who added it. */
  removeAddedDilemma(playerId: string, dilemmaId: string): void {
    this.#ensureHostInLobby(playerId);
    const before = this.#addedDilemmas.length;
    this.#addedDilemmas = this.#addedDilemmas.filter((added) => added.dilemmaId !== dilemmaId);
    if (this.#addedDilemmas.length !== before) this.#changeLobby('dilemmas-changed');
  }

  /** The host takes a player out of the lobby; they cannot come back to that game. */
  expel(hostId: string, playerId: string): void {
    this.#ensureHostInLobby(hostId);
    if (playerId === this.#host.id) throw new HostCannotBeExpelledError();
    const player = this.#player(playerId);

    this.#players.splice(this.#players.indexOf(player), 1);
    this.#connections.delete(playerId);
    this.#addedDilemmas = this.#addedDilemmas.filter((added) => added.playerId !== playerId);
    this.#expelledIdentities.add(player.identity);
    this.#changeLobby('player-expelled');
  }

  /** The fewest players a game of this room starts with, by its variant. */
  get minimumPlayers(): number {
    return MINIMUM_PLAYERS[this.#settings.variant];
  }

  /**
   * Whether the player may start a game now, as `startGame` checks it: the host, in the lobby,
   * with the players its variant needs. So nothing is put together for a game that cannot start.
   */
  ensureCanStartGame(playerId: string): void {
    this.#ensureHostInLobby(playerId);
    const minimum = this.minimumPlayers;
    if (this.#players.length < minimum) throw new NotEnoughPlayersError(minimum);
  }

  /** The host starts the game the lobby got ready, with the players its variant needs. */
  startGame(playerId: string, gameId: string): void {
    this.ensureCanStartGame(playerId);

    this.#currentGameId = new IdVO(gameId);
    this.#changeLobby('game-started');
  }

  /** The player opens a connection, on top of any others they have open, such as another tab. */
  connect(playerId: string, connectionId: string): void {
    const connection = new IdVO(connectionId);
    const wasConnected = this.isConnected(playerId);

    const open = this.#connections.get(playerId) ?? new Set();
    open.add(connection.value);
    this.#connections.set(playerId, open);
    if (!wasConnected) this.#changeConnection(playerId, true);
  }

  /**
   * A connection closes. The player stays connected while another of theirs is open, so a close
   * that comes after they connected again changes nothing.
   */
  disconnect(playerId: string, connectionId: string): void {
    const open = this.#connections.get(playerId);
    if (!open?.delete(connectionId)) return;
    if (open.size > 0) return;

    this.#connections.delete(playerId);
    this.#changeConnection(playerId, false);
  }

  isConnected(playerId: string): boolean {
    this.#player(playerId);
    return this.#connections.has(playerId);
  }

  /** Returns the events recorded since the last call and forgets them. */
  pullEvents(): DomainEvent[] {
    const events = this.#events;
    this.#events = [];
    return events;
  }

  toSnapshot(): RoomSnapshot {
    return {
      id: this.id,
      code: this.code,
      hostId: this.#host.id,
      groupNature: this.#groupNature,
      place: this.#place,
      settings: this.#settings.toSnapshot(),
      players: this.#players.map((player) => player.toSnapshot()),
      version: this.#version,
      connections: [...this.#connections].flatMap(([playerId, open]) =>
        [...open].map((connectionId) => ({ playerId, connectionId })),
      ),
      expelledIdentities: [...this.#expelledIdentities],
      addedDilemmas: this.addedDilemmas,
      pickedDilemmas: this.pickedDilemmas,
      currentGameId: this.currentGameId,
    };
  }

  static restore(snapshot: RoomSnapshot): Room {
    const players = snapshot.players.map((player) => Player.restore(player));
    const host = players.find((player) => player.id === snapshot.hostId);
    if (!host) throw new HostMissingError();

    const room = new Room(snapshot, host, players);
    room.#version = snapshot.version;
    for (const { playerId, connectionId } of snapshot.connections) {
      const open = room.#connections.get(playerId) ?? new Set();
      open.add(new IdVO(connectionId).value);
      room.#connections.set(playerId, open);
    }
    for (const identity of snapshot.expelledIdentities) room.#expelledIdentities.add(identity);
    room.#addedDilemmas = [...snapshot.addedDilemmas];
    room.#pickedDilemmas = [...snapshot.pickedDilemmas];
    room.#currentGameId = snapshot.currentGameId === null ? null : new IdVO(snapshot.currentGameId);
    return room;
  }

  #player(playerId: string): Player {
    const player = this.#players.find((candidate) => candidate.id === playerId);
    if (!player) throw new PlayerNotInRoomError(playerId);
    return player;
  }

  #ensureHostInLobby(playerId: string): void {
    this.#player(playerId);
    if (playerId !== this.#host.id) throw new NotHostError(playerId);
    if (!this.isInLobby) throw new GameInProgressError(this.id);
  }

  #isWorn(avatar: AvatarVO): boolean {
    return this.#players.some((player) => player.avatar.equals(avatar));
  }

  #suits(dilemma: LobbyDilemma): boolean {
    return dilemma.minimumAge <= this.#settings.maximumMinimumAge;
  }

  #changeLobby(change: LobbyChange): void {
    this.#version += 1;
    this.#events.push(new LobbyChangedEvent(this.id, change, this.#version));
  }

  #changeConnection(playerId: string, connected: boolean): void {
    this.#version += 1;
    this.#events.push(new ConnectionChangedEvent(this.id, playerId, connected, this.#version));
  }
}
