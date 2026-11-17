import { DilemmaNotSuitableError } from '../errors/dilemma-not-suitable.error.ts';
import { DuplicateDilemmaError } from '../errors/duplicate-dilemma.error.ts';
import { GameInProgressError } from '../errors/game-in-progress.error.ts';
import { GameNotInProgressError } from '../errors/game-not-in-progress.error.ts';
import { HostCannotBeExpelledError } from '../errors/host-cannot-be-expelled.error.ts';
import { HostMissingError } from '../errors/host-missing.error.ts';
import { NicknameAndAvatarTakenError } from '../errors/nickname-and-avatar-taken.error.ts';
import { NotEnoughPlayersError } from '../errors/not-enough-players.error.ts';
import { NotChooserError } from '../errors/not-chooser.error.ts';
import { NotHostError } from '../errors/not-host.error.ts';
import { PlayerExpelledError } from '../errors/player-expelled.error.ts';
import { PlayerNotInRoomError } from '../errors/player-not-in-room.error.ts';
import { RoomClosedError } from '../errors/room-closed.error.ts';
import { RoomFullError } from '../errors/room-full.error.ts';
import { RoundNotForPlayersError } from '../errors/round-not-for-players.error.ts';
import { RoundNotFoundError } from '../errors/round-not-found.error.ts';
import { RoundTakenError } from '../errors/round-taken.error.ts';
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
import type { Category } from '../vos/category.vo.ts';
import { randomRound, type LobbyDilemma, type RoundSnapshot } from '../vos/round.vo.ts';
import { Player, type PlayerSnapshot } from './player.ts';

/**
 * The fewest players a game starts with. With two in an anonymous room, the distribution of the
 * votes in the reveal would tell each one what the other voted.
 */
export const MINIMUM_PLAYERS: Readonly<Record<RoomVariant, number>> = { nominal: 2, anonymous: 3 };
export const MAXIMUM_PLAYERS = 50;

/** How long a room stays open with no player connected (glossary, «Cerrar la sala»). */
export const CLOSES_WITH_NOBODY_CONNECTED_AFTER_MS = 15 * 60 * 1000;

export type { LobbyDilemma } from '../vos/round.vo.ts';

/**
 * The dilemma a player chose in the lobby for a round of the players. Who chose it stays in the room
 * until the reveal.
 */
export interface ChosenDilemma extends LobbyDilemma {
  readonly roundId: number;
  readonly playerId: string;
}

/** A round as the host sets it; one without an id is a new one, and a specific one names its dilemma. */
export type RoundChange =
  | {
      readonly id?: number;
      readonly origin: 'random';
      readonly categories: readonly Category[] | null;
    }
  | { readonly id?: number; readonly origin: 'specific'; readonly dilemmaId: string }
  | { readonly id?: number; readonly origin: 'players' };

/** What the host changes in the settings: the rounds whole, the rest one by one. */
export interface RoomSettingsChanges extends Partial<Omit<RoomSettingsSnapshot, 'rounds'>> {
  readonly rounds?: readonly RoundChange[];
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
  /** The dilemmas the players chose for their rounds; the specific ones are in the settings. */
  readonly chosenDilemmas: readonly ChosenDilemma[];
  readonly currentGameId: string | null;
  /** The host who lost the role while disconnected, and gets it back on connecting again. */
  readonly absentHostId: string | null;
  /** Who left the game in progress on purpose. */
  readonly leftPlayerIds: readonly string[];
  /** When the latest of its connections closed; until any closes, when it was created. */
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
  /** A dilemma of the general catalog for the first round, specific, if the room suits it. */
  readonly firstRoundDilemma?: LobbyDilemma;
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
  #chosenDilemmas: ChosenDilemma[] = [];
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

  /**
   * The room is born with its host, who is its first player, and the default settings, and with
   * that dilemma in its first round if it is given one that suits it.
   */
  static create(props: CreateRoomProps, idGenerator: IdGenerator): Room {
    const id = idGenerator.generate();
    const settings = RoomSettingsVO.defaults(props.dilemmaLanguage).toSnapshot();
    const host = Player.create(
      { nickname: props.hostNickname, identity: props.hostIdentity, avatar: props.hostAvatar },
      idGenerator,
    );
    const { code, groupNature, place, createdAt } = props;
    const lastConnectedAt = createdAt;
    const room = new Room({ id, code, groupNature, place, settings, lastConnectedAt }, host, [
      host,
    ]);
    if (props.firstRoundDilemma) {
      const { dilemmaId, minimumAge, compromising } = props.firstRoundDilemma;
      if (!room.#suits(props.firstRoundDilemma)) throw new DilemmaNotSuitableError(dilemmaId);
      const [first, ...rest] = room.#settings.rounds;
      const dilemma = { dilemmaId, minimumAge, compromising };
      room.#settings = room.#settings.with({
        rounds: [{ id: first!.id, origin: 'specific', dilemma }, ...rest],
      });
    }
    return room;
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

  get chosenDilemmas(): readonly ChosenDilemma[] {
    return this.#chosenDilemmas.map((chosen) => ({ ...chosen }));
  }

  /** The ids of the dilemmas in its rounds, specific or chosen by a player. */
  get roundDilemmaIds(): readonly string[] {
    return [
      ...this.#settings.rounds.flatMap((round) =>
        round.origin === 'specific' ? [round.dilemma.dilemmaId] : [],
      ),
      ...this.#chosenDilemmas.map(({ dilemmaId }) => dilemmaId),
    ];
  }

  get currentGameId(): string | null {
    return this.#currentGameId?.value ?? null;
  }

  /**
   * Whether the room still lets anyone in at that moment. It closes when every player has left, or
   * after a while with no player connected; while anyone is connected, it stays open even if
   * nobody does anything. Once closed, it never opens again: it lets nobody join or connect.
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
   * back, so joining twice changes nothing. Nobody joins a closed room, not even who was in it.
   */
  join(
    {
      nickname,
      identity,
      avatar,
    }: { readonly nickname: string; readonly identity: string; readonly avatar: AvatarVO },
    idGenerator: IdGenerator,
    at: Date,
  ): Player {
    this.#ensureOpenAt(at);
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
   * Only the host, and only in the lobby. A new round takes the next id. The dilemmas the room does
   * not know yet, and all of them if the language changes, come as the catalog has them in the
   * language of the new settings: one that is not there, or no longer suits the room, leaves its
   * round random from every category. A specific dilemma the host just set has to be there and suit
   * the room, and cannot be in another round.
   */
  changeSettings(
    playerId: string,
    changes: RoomSettingsChanges,
    dilemmas: readonly LobbyDilemma[] = [],
  ): void {
    this.#ensureHostInLobby(playerId);
    const { rounds: roundChanges, ...rest } = changes;
    const current = this.#settings.rounds;
    const withoutRounds = this.#settings.with(rest);
    const known =
      withoutRounds.dilemmaLanguage === this.#settings.dilemmaLanguage
        ? [
            ...current.flatMap((round) => (round.origin === 'specific' ? [round.dilemma] : [])),
            ...this.#chosenDilemmas,
          ]
        : [];
    const found = (dilemmaId: string): LobbyDilemma | undefined => {
      const dilemma = [...dilemmas, ...known].find(
        (candidate) => candidate.dilemmaId === dilemmaId,
      );
      return dilemma && this.#suits(dilemma, withoutRounds) ? dilemma : undefined;
    };

    const given = roundChanges ?? current.map(toRoundChange);
    let nextId = Math.max(0, ...current.map(({ id }) => id), ...given.map(({ id }) => id ?? 0));
    const rounds = given.map((change): RoundSnapshot => {
      const id = change.id ?? (nextId += 1);
      if (change.origin === 'random') {
        return { id, origin: 'random', categories: change.categories };
      }
      if (change.origin === 'players') return { id, origin: 'players' };
      const dilemma = found(change.dilemmaId);
      if (dilemma) return { id, origin: 'specific', dilemma: { ...dilemma } };
      const before = current.find((round) => round.id === id);
      const kept = before?.origin === 'specific' && before.dilemma.dilemmaId === change.dilemmaId;
      if (kept) return randomRound(id);
      throw new DilemmaNotSuitableError(change.dilemmaId);
    });

    // A dilemma a player chose stays while its round is still theirs and the room suits it.
    const leftOut: number[] = [];
    const chosen = this.#chosenDilemmas.filter((dilemma) => {
      if (!rounds.some(({ id, origin }) => id === dilemma.roundId && origin === 'players')) {
        return false;
      }
      if (found(dilemma.dilemmaId)) return true;
      leftOut.push(dilemma.roundId);
      return false;
    });
    const specificIds = rounds.flatMap((round) =>
      round.origin === 'specific' ? [round.dilemma.dilemmaId] : [],
    );
    const repeated = chosen.find(({ dilemmaId }) => specificIds.includes(dilemmaId));
    if (repeated) throw new DuplicateDilemmaError(repeated.dilemmaId);

    this.#settings = withoutRounds.with({
      rounds: rounds.map((round) => (leftOut.includes(round.id) ? randomRound(round.id) : round)),
    });
    this.#chosenDilemmas = chosen;
    this.#changeLobby('settings-changed');
  }

  /**
   * Any player, the host too, chooses the dilemma of an empty round of the players, one that suits
   * the room and is not in another round.
   */
  chooseRoundDilemma(playerId: string, roundId: number, dilemma: LobbyDilemma): void {
    this.#player(playerId);
    if (!this.isInLobby) throw new GameInProgressError(this.id);
    const round = this.#settings.rounds.find(({ id }) => id === roundId);
    if (!round) throw new RoundNotFoundError(roundId);
    if (round.origin !== 'players') throw new RoundNotForPlayersError(roundId);
    if (this.#chosenDilemmas.some((chosen) => chosen.roundId === roundId)) {
      throw new RoundTakenError(roundId);
    }
    if (this.roundDilemmaIds.includes(dilemma.dilemmaId)) {
      throw new DuplicateDilemmaError(dilemma.dilemmaId);
    }
    if (!this.#suits(dilemma)) throw new DilemmaNotSuitableError(dilemma.dilemmaId);

    const { dilemmaId, minimumAge, compromising } = dilemma;
    this.#chosenDilemmas.push({ dilemmaId, minimumAge, compromising, roundId, playerId });
    this.#changeLobby('dilemmas-changed');
  }

  /** Only the player who chose the dilemma of a round takes it out, and the round is empty again. */
  clearRoundDilemma(playerId: string, roundId: number): void {
    this.#player(playerId);
    if (!this.isInLobby) throw new GameInProgressError(this.id);
    const chosen = this.#chosenDilemmas.find((dilemma) => dilemma.roundId === roundId);
    if (!chosen) return;
    if (chosen.playerId !== playerId) throw new NotChooserError(playerId, roundId);

    this.#chosenDilemmas = this.#chosenDilemmas.filter((dilemma) => dilemma !== chosen);
    this.#changeLobby('dilemmas-changed');
  }

  /** The host takes a player out of the lobby; they cannot come back to that game. */
  expel(hostId: string, playerId: string): void {
    this.#ensureHostInLobby(hostId);
    if (playerId === this.#hostId) throw new HostCannotBeExpelledError();
    const player = this.#player(playerId);

    this.#players.splice(this.#players.indexOf(player), 1);
    this.#connections.delete(playerId);
    this.#chosenDilemmas = this.#chosenDilemmas.filter((chosen) => chosen.playerId !== playerId);
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

  /**
   * The host starts the game the lobby got ready, with the players its variant needs. The dilemmas
   * of its rounds go to this game only: for the next one, a specific round is random from every
   * category and a round of the players is empty.
   */
  startGame(playerId: string, gameId: string): void {
    this.ensureCanStartGame(playerId);

    this.#currentGameId = new IdVO(gameId);
    this.#settings = this.#settings.with({
      rounds: this.#settings.rounds.map((round) =>
        round.origin === 'specific' ? randomRound(round.id) : round,
      ),
    });
    this.#chosenDilemmas = [];
    this.#changeLobby('game-started');
  }

  /**
   * The player opens a connection, on top of any others they have open, such as another tab. A
   * host who lost the role while disconnected gets it back. A closed room takes nobody back.
   */
  connect(playerId: string, connectionId: string, at: Date): void {
    this.#ensureOpenAt(at);
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
    if (this.#connections.delete(playerId)) {
      this.#connectionClosed(at);
      this.#changeConnection(playerId, false);
    }
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
    this.#connectionClosed(at);
    if (open.size > 0) return;

    this.#connections.delete(playerId);
    this.#changeConnection(playerId, false);
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
      chosenDilemmas: this.chosenDilemmas,
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
    room.#chosenDilemmas = snapshot.chosenDilemmas.map((chosen) => ({ ...chosen }));
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

  /** For the age of the room, and not compromising unless the room includes those. */
  #suits(dilemma: LobbyDilemma, settings: RoomSettingsVO = this.#settings): boolean {
    return (
      dilemma.minimumAge <= settings.maximumMinimumAge &&
      (!dilemma.compromising || settings.includesCompromisingDilemmas)
    );
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

  /**
   * A connection closed at that moment. The room counts from the latest one that closed, never back:
   * the connections of an instance that died are closed later, as closed when it was last seen.
   */
  #connectionClosed(at: Date): void {
    if (at > this.#lastConnectedAt) this.#lastConnectedAt = new Date(at);
  }

  #ensureOpenAt(at: Date): void {
    if (!this.isOpenAt(at)) throw new RoomClosedError(this.id);
  }

  #changeConnection(playerId: string, connected: boolean): void {
    this.#version += 1;
    this.#events.push(new ConnectionChangedEvent(this.id, playerId, connected, this.#version));
  }
}

/** A round of the settings as the host would set it again, to keep it as it is. */
function toRoundChange(round: RoundSnapshot): RoundChange {
  return round.origin === 'specific'
    ? { id: round.id, origin: 'specific', dilemmaId: round.dilemma.dilemmaId }
    : round;
}
