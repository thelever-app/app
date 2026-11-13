import { AddingDilemmasNotAllowedError } from '../errors/adding-dilemmas-not-allowed.error.ts';
import { DilemmaNotSuitableError } from '../errors/dilemma-not-suitable.error.ts';
import { DuplicateDilemmaError } from '../errors/duplicate-dilemma.error.ts';
import { GameInProgressError } from '../errors/game-in-progress.error.ts';
import { GameNotInProgressError } from '../errors/game-not-in-progress.error.ts';
import { HostCannotBeExpelledError } from '../errors/host-cannot-be-expelled.error.ts';
import { HostMissingError } from '../errors/host-missing.error.ts';
import { NicknameAndAvatarTakenError } from '../errors/nickname-and-avatar-taken.error.ts';
import { NotEnoughPlayersError } from '../errors/not-enough-players.error.ts';
import { NotHostError } from '../errors/not-host.error.ts';
import { PlayerExpelledError } from '../errors/player-expelled.error.ts';
import { PlayerNotInRoomError } from '../errors/player-not-in-room.error.ts';
import { RoomFullError } from '../errors/room-full.error.ts';
import { TooManyAddedDilemmasError } from '../errors/too-many-added-dilemmas.error.ts';
import { ConnectionChangedEvent } from '../events/connection-changed.event.ts';
import type { DomainEvent } from '../events/domain-event.ts';
import { HostChangedEvent } from '../events/host-changed.event.ts';
import { PlayerLeftEvent } from '../events/player-left.event.ts';
import { LobbyChangedEvent, type LobbyChange } from '../events/lobby-changed.event.ts';
import type { IdGenerator } from '../ports/id-generator.port.ts';
import type { Randomness } from '../ports/randomness.port.ts';
import { pickOne } from '../services/random-choice.ts';
import { AvatarVO } from '../vos/avatar.vo.ts';
import { toGroupNature, toPlace, type GroupNature, type Place } from '../vos/group.vo.ts';
import { IdVO } from '../vos/id.vo.ts';
import { NicknameVO } from '../vos/nickname.vo.ts';
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

/** How long a room stays open with no player connected (glossary, «Cerrar la sala»). */
export const CLOSES_WITH_NOBODY_CONNECTED_AFTER_MS = 15 * 60 * 1000;

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
  /** The dilemmas the host picked one by one; none, and the game is put together by categories. */
  readonly pickedDilemmas: readonly LobbyDilemma[];
  readonly currentGameId: string | null;
  /** The host who lost the role while disconnected, and gets it back on connecting again. */
  readonly absentHostId: string | null;
  /** Who left the game in progress on purpose. */
  readonly leftPlayerIds: readonly string[];
  /** When its last connection closed; until anyone connects, when it was created. */
  readonly lastConnectedAt: Date;
  /** When every player had left; the room closes too after a while with nobody connected. */
  readonly closedAt: Date | null;
}

export interface CreateRoomProps {
  readonly hostNickname: string;
  readonly hostIdentity: string;
  readonly hostAvatar: AvatarVO;
  readonly groupNature: string;
  readonly place: string;
  /** The language of the device of the host, which the dilemmas use until the host changes it. */
  readonly dilemmaLanguage: string;
  /** Unique among the rooms, closed ones too until they are deleted, which the room cannot know. */
  readonly code: string;
  /** Which also counts as the last moment someone was connected: the host has not connected yet. */
  readonly createdAt: Date;
}

export class Room {
  readonly #id: IdVO;
  readonly #code: RoomCodeVO;
  #hostId: string;
  #absentHostId: string | null = null;
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
  readonly #leftPlayerIds = new Set<string>();
  #lastConnectedAt: Date;
  #closedAt: Date | null = null;
  #events: DomainEvent[] = [];

  private constructor(
    snapshot: {
      readonly id: string;
      readonly code: string;
      readonly groupNature: string;
      readonly place: string;
      readonly settings: RoomSettingsSnapshot;
      readonly lastConnectedAt: Date;
    },
    host: Player,
    players: readonly Player[],
  ) {
    this.#id = new IdVO(snapshot.id);
    this.#code = new RoomCodeVO(snapshot.code);
    this.#groupNature = toGroupNature(snapshot.groupNature);
    this.#place = toPlace(snapshot.place);
    this.#settings = new RoomSettingsVO(snapshot.settings);
    this.#hostId = host.id;
    this.#players = [...players];
    this.#lastConnectedAt = new Date(snapshot.lastConnectedAt);
  }

  /** The room is born with its host, who is its first player, and the default settings. */
  static create(props: CreateRoomProps, idGenerator: IdGenerator): Room {
    const id = idGenerator.generate();
    const settings = RoomSettingsVO.defaults(props.dilemmaLanguage).toSnapshot();
    const host = Player.create(
      { nickname: props.hostNickname, identity: props.hostIdentity, avatar: props.hostAvatar },
      idGenerator,
    );
    const { code, groupNature, place, createdAt } = props;
    const lastConnectedAt = createdAt;
    return new Room({ id, code, groupNature, place, settings, lastConnectedAt }, host, [host]);
  }

  get id(): string {
    return this.#id.value;
  }

  get code(): string {
    return this.#code.value;
  }

  get host(): Player {
    return this.#player(this.#hostId);
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

  /**
   * Whether the room still lets anyone in at that moment. It closes when every player has left, or
   * after a while with no player connected; while anyone is connected, it stays open even if
   * nobody does anything. Once closed, it never opens again.
   */
  isOpenAt(now: Date): boolean {
    if (this.#closedAt) return false;
    if (this.#connections.size > 0) return true;
    return now.getTime() - this.#lastConnectedAt.getTime() < CLOSES_WITH_NOBODY_CONNECTED_AFTER_MS;
  }

  /** Without a game in progress, the room is in the lobby. */
  get isInLobby(): boolean {
    return this.#currentGameId === null;
  }

  /**
   * A new player joins with the avatar they chose. Whoever is already in the room gets their player
   * back, so joining twice changes nothing.
   */
  join(
    {
      nickname,
      identity,
      avatar,
    }: { readonly nickname: string; readonly identity: string; readonly avatar: AvatarVO },
    idGenerator: IdGenerator,
  ): Player {
    const existing = this.playerWith(identity);
    if (existing) {
      // Who left the game on purpose comes back as a player, never as the host.
      if (this.#leftPlayerIds.delete(existing.id)) {
        this.#version += 1;
        this.#events.push(new PlayerLeftEvent(this.id, existing.id, false, this.#version));
      }
      return existing;
    }
    if (this.#expelledIdentities.has(identity)) throw new PlayerExpelledError(this.id);
    if (this.#players.length >= MAXIMUM_PLAYERS) throw new RoomFullError(this.id);

    this.#ensureNobodyLooksTheSame(new NicknameVO(nickname), avatar);

    const player = Player.create({ nickname, identity, avatar }, idGenerator);
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

  /** At random, an avatar nobody in the room has, for whoever is about to join. */
  suggestAvatar(randomness: Randomness): AvatarVO {
    const free = AvatarVO.all().filter((avatar) => !this.#isWorn(avatar));
    return pickOne(free, randomness);
  }

  /** The player changes to any avatar but one that someone with the same nickname has. */
  changeAvatar(playerId: string, avatar: AvatarVO): void {
    const player = this.#player(playerId);
    if (player.avatar.equals(avatar)) return;
    this.#ensureNobodyLooksTheSame(new NicknameVO(player.nickname), avatar, playerId);

    player.wear(avatar);
    this.#changeLobby('avatar-changed');
  }

  /**
   * Only the host, and only in the lobby. Dilemmas that no longer suit the room are dropped, and
   * each player keeps only the first ones they added that the room still allows.
   */
  changeSettings(playerId: string, changes: Partial<RoomSettingsSnapshot>): void {
    this.#ensureHostInLobby(playerId);

    this.#settings = this.#settings.with(changes);
    const suits = (dilemma: LobbyDilemma): boolean => this.#suits(dilemma);
    const allowed = this.#settings.dilemmasPerPlayer;
    this.#addedDilemmas = this.#addedDilemmas
      .filter(suits)
      .filter((added, index, all) => this.#addedBefore(added.playerId, all, index) < allowed);
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

  /**
   * When the host allows it, each player, the host too, adds dilemmas that suit the room, up to
   * as many as the room allows each one.
   */
  addDilemma(playerId: string, dilemma: LobbyDilemma): void {
    this.#player(playerId);
    if (!this.isInLobby) throw new GameInProgressError(this.id);
    const allowed = this.#settings.dilemmasPerPlayer;
    if (allowed === 0) throw new AddingDilemmasNotAllowedError(this.id);
    const added = this.#addedBefore(playerId, this.#addedDilemmas, this.#addedDilemmas.length);
    if (added >= allowed) throw new TooManyAddedDilemmasError(playerId, allowed);
    if (this.#addedDilemmas.some((added) => added.dilemmaId === dilemma.dilemmaId)) {
      throw new DuplicateDilemmaError(dilemma.dilemmaId);
    }
    if (!this.#suits(dilemma)) throw new DilemmaNotSuitableError(dilemma.dilemmaId);

    this.#addedDilemmas.push({ ...dilemma, playerId });
    this.#changeLobby('dilemmas-changed');
  }

  /**
   * The host removes any dilemma a player added, without knowing who added it; any other player,
   * only one they added themselves.
   */
  removeAddedDilemma(playerId: string, dilemmaId: string): void {
    this.#player(playerId);
    if (!this.isInLobby) throw new GameInProgressError(this.id);
    const removed = this.#addedDilemmas.find((added) => added.dilemmaId === dilemmaId);
    if (!removed) return;
    if (playerId !== this.#hostId && removed.playerId !== playerId) {
      throw new NotHostError(playerId);
    }

    this.#addedDilemmas = this.#addedDilemmas.filter((added) => added !== removed);
    this.#changeLobby('dilemmas-changed');
  }

  /** The host takes a player out of the lobby; they cannot come back to that game. */
  expel(hostId: string, playerId: string): void {
    this.#ensureHostInLobby(hostId);
    if (playerId === this.#hostId) throw new HostCannotBeExpelledError();
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

  /**
   * The player opens a connection, on top of any others they have open, such as another tab. A
   * host who lost the role while disconnected gets it back.
   */
  connect(playerId: string, connectionId: string): void {
    const connection = new IdVO(connectionId);
    const wasConnected = this.isConnected(playerId);

    const open = this.#connections.get(playerId) ?? new Set();
    open.add(connection.value);
    this.#connections.set(playerId, open);
    if (!wasConnected) this.#changeConnection(playerId, true);
    if (playerId === this.#absentHostId && !this.#leftPlayerIds.has(playerId)) {
      this.#absentHostId = null;
      this.#changeHost(playerId);
    }
  }

  /**
   * The player leaves the game in progress on purpose: their connections close and, if they were
   * the host, the role passes on for good to a player of the game, also one who is not connected.
   * They keep their place in the room and can join again, unless they were the last to leave: then
   * the room closes.
   */
  leave(playerId: string, gamePlayerIds: readonly string[], at: Date): void {
    this.#player(playerId);
    if (this.isInLobby) throw new GameNotInProgressError(this.id);
    if (this.#leftPlayerIds.has(playerId)) return;

    this.#leftPlayerIds.add(playerId);
    if (this.#connections.delete(playerId)) this.#lastConnectionClosed(playerId, at);
    if (this.#leftPlayerIds.size === this.#players.length) this.#closedAt = new Date(at);
    this.#version += 1;
    this.#events.push(new PlayerLeftEvent(this.id, playerId, true, this.#version));
    if (playerId === this.#hostId) this.#passHostOnFor(playerId, gamePlayerIds);
    if (playerId === this.#absentHostId) this.#absentHostId = null;
  }

  hasLeft(playerId: string): boolean {
    this.#player(playerId);
    return this.#leftPlayerIds.has(playerId);
  }

  /**
   * The host is away (disconnected) when the game needs one: the role passes to the connected
   * player of the game who has been in the room longest, and the host gets it back on connecting
   * again.
   */
  handOverHost(gamePlayerIds: readonly string[]): void {
    if (this.isConnected(this.#hostId)) return;
    const absentHostId = this.#hostId;
    if (this.#handOverHost(gamePlayerIds)) this.#absentHostId ??= absentHostId;
  }

  /**
   * A connection closes. The player stays connected while another of theirs is open, so a close
   * that comes after they connected again changes nothing.
   */
  disconnect(playerId: string, connectionId: string, at: Date): void {
    const open = this.#connections.get(playerId);
    if (!open?.delete(connectionId)) return;
    if (open.size > 0) return;

    this.#connections.delete(playerId);
    this.#lastConnectionClosed(playerId, at);
  }

  /** Who has a connection open, in the order they joined. */
  get connectedPlayerIds(): readonly string[] {
    return this.#players.filter(({ id }) => this.#connections.has(id)).map(({ id }) => id);
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
      hostId: this.#hostId,
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
      absentHostId: this.#absentHostId,
      leftPlayerIds: [...this.#leftPlayerIds],
      lastConnectedAt: new Date(this.#lastConnectedAt),
      closedAt: this.#closedAt && new Date(this.#closedAt),
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
    room.#absentHostId = snapshot.absentHostId;
    for (const playerId of snapshot.leftPlayerIds) room.#leftPlayerIds.add(playerId);
    room.#closedAt = snapshot.closedAt && new Date(snapshot.closedAt);
    return room;
  }

  #player(playerId: string): Player {
    const player = this.#players.find((candidate) => candidate.id === playerId);
    if (!player) throw new PlayerNotInRoomError(playerId);
    return player;
  }

  #ensureHostInLobby(playerId: string): void {
    this.#player(playerId);
    if (playerId !== this.#hostId) throw new NotHostError(playerId);
    if (!this.isInLobby) throw new GameInProgressError(this.id);
  }

  /** How many of the added dilemmas before that position the player added. */
  #addedBefore(playerId: string, added: readonly AddedDilemma[], position: number): number {
    return added.slice(0, position).filter((dilemma) => dilemma.playerId === playerId).length;
  }

  #isWorn(avatar: AvatarVO): boolean {
    return this.#players.some((player) => player.avatar.equals(avatar));
  }

  /** Two players never share both the nickname and the avatar, so they can always be told apart. */
  #ensureNobodyLooksTheSame(nickname: NicknameVO, avatar: AvatarVO, playerId?: string): void {
    const lookalike = this.#players.some(
      (other) =>
        other.id !== playerId &&
        other.avatar.equals(avatar) &&
        new NicknameVO(other.nickname).sameAs(nickname),
    );
    if (lookalike) throw new NicknameAndAvatarTakenError(nickname.value, avatar.face, avatar.color);
  }

  #suits(dilemma: LobbyDilemma): boolean {
    return dilemma.minimumAge <= this.#settings.maximumMinimumAge;
  }

  #changeLobby(change: LobbyChange): void {
    this.#version += 1;
    this.#events.push(new LobbyChangedEvent(this.id, change, this.#version));
  }

  /**
   * To the connected player of the game who has been in the room longest and has not left; whether
   * anyone took it.
   */
  #handOverHost(gamePlayerIds: readonly string[]): boolean {
    const successor = this.#players.find(
      ({ id }) =>
        id !== this.#hostId &&
        gamePlayerIds.includes(id) &&
        this.#connections.has(id) &&
        !this.#leftPlayerIds.has(id),
    );
    if (!successor) return false;
    this.#changeHost(successor.id);
    return true;
  }

  /**
   * For good, to the player of the game who has been in the room longest and has not left,
   * connected or not.
   */
  #passHostOnFor(playerId: string, gamePlayerIds: readonly string[]): void {
    const successor = this.#players.find(
      ({ id }) => id !== playerId && gamePlayerIds.includes(id) && !this.#leftPlayerIds.has(id),
    );
    if (successor) this.#changeHost(successor.id);
  }

  #changeHost(hostId: string): void {
    this.#hostId = hostId;
    this.#version += 1;
    this.#events.push(new HostChangedEvent(this.id, hostId, this.#version));
  }

  /** The player has no connection open any more; if nobody has, the room counts from now. */
  #lastConnectionClosed(playerId: string, at: Date): void {
    if (this.#connections.size === 0) this.#lastConnectedAt = new Date(at);
    this.#changeConnection(playerId, false);
  }

  #changeConnection(playerId: string, connected: boolean): void {
    this.#version += 1;
    this.#events.push(new ConnectionChangedEvent(this.id, playerId, connected, this.#version));
  }
}
