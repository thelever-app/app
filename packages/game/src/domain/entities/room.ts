import { DilemmaAlreadyPlayedError } from '../errors/dilemma-already-played.error.ts';
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
import { AdultsOnlyRoomError } from '../errors/adults-only-room.error.ts';
import { InvalidRoomSettingError } from '../errors/invalid-room-setting.error.ts';
import { MinorInRoomError } from '../errors/minor-in-room.error.ts';
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
import { AMBIENCES, type Ambience, keptForANewRoom, settingsOf } from '../vos/ambience.vo.ts';
import { AvatarVO } from '../vos/avatar.vo.ts';
import { IdVO } from '../vos/id.vo.ts';
import { genericNickname, NicknameVO } from '../vos/nickname.vo.ts';
import { RoomCodeVO } from '../vos/room-code.vo.ts';
import {
  RoomSettingsVO,
  type RoomSettingsSnapshot,
  type RoomVariant,
} from '../vos/room-settings.vo.ts';
import type { Category } from '../vos/category.vo.ts';
import {
  ANY_CONTENT,
  randomRound,
  type LobbyDilemma,
  type RoundContent,
  type RoundSnapshot,
} from '../vos/round.vo.ts';
import { Player, type PlayerSnapshot } from './player.ts';

/**
 * The fewest players a game starts with. With two in an anonymous room, the distribution of the
 * votes in the reveal would tell each one what the other voted.
 */
export const MINIMUM_PLAYERS: Readonly<Record<RoomVariant, number>> = { nominal: 2, anonymous: 3 };

/**
 * The fewest players a game plays the dilemmas with the gap with: with fewer, the person in the gap
 * would predict one or two players, and in an anonymous room the distribution of the others would
 * give their votes away.
 */
export const MINIMUM_PLAYERS_FOR_THE_GAP: Readonly<Record<RoomVariant, number>> = {
  nominal: 3,
  anonymous: 4,
};
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
  /**
   * Null once the player who chose it was expelled: the dilemma stays in its round, so that nobody
   * learns who chose it by seeing the round empty again.
   */
  readonly playerId: string | null;
}

/** A round as the host sets it; one without an id is a new one, and a specific one names its dilemma. */
export type RoundChange =
  | {
      readonly id?: number;
      readonly origin: 'random';
      readonly categories: readonly Category[] | null;
      /** Any content unless given. */
      readonly content?: RoundContent;
    }
  | { readonly id?: number; readonly origin: 'specific'; readonly dilemmaId: string }
  | { readonly id?: number; readonly origin: 'players' };

/** What the host changes in the settings: the rounds whole, the rest one by one. */
/** What the host may change: everything but the rounds as they are, and the language, which nobody changes. */
export interface RoomSettingsChanges extends Partial<
  Omit<RoomSettingsSnapshot, 'rounds' | 'dilemmaLanguage'>
> {
  readonly rounds?: readonly RoundChange[];
}

export interface RoomSnapshot {
  readonly id: string;
  readonly code: string;
  readonly hostId: string;
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
  /** The dilemmas of every game the room played before the one in progress or getting ready. */
  readonly playedDilemmaIds: readonly string[];
  /** When the latest of its connections closed; until any closes, when it was created. */
  readonly lastConnectedAt: Date;
  /** When every player had left; the room closes too after a while with nobody connected. */
  readonly closedAt: Date | null;
}

export interface CreateRoomProps {
  /** The ambience the room starts with, which sets up its configuration. */
  readonly ambience: string;
  readonly hostNickname: string;
  readonly hostIdentity: string;
  readonly hostAvatar: AvatarVO;
  /** The language of the device of the host, which the dilemmas use until the host changes it. */
  readonly dilemmaLanguage: string;
  /** Unique among the rooms, closed ones too until they are deleted, which the room cannot know. */
  readonly code: string;
  /** Which also counts as the last moment someone was connected: the host has not connected yet. */
  readonly createdAt: Date;
  /** A dilemma of the general catalog for the first round, specific, if the room suits it. */
  readonly firstRoundDilemma?: LobbyDilemma;
  /** The dilemmas the device of the host says they played. */
  readonly hostPlayedDilemmaIds?: readonly string[];
  /** Whether the host is under 18, by the age they declared. */
  readonly hostUnderEighteen: boolean;
}

export class Room {
  readonly #id: IdVO;
  readonly #code: RoomCodeVO;
  #hostId: string;
  #absentHostId: string | null = null;
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
  readonly #playedDilemmaIds = new Set<string>();
  #lastConnectedAt: Date;
  #closedAt: Date | null = null;
  #events: DomainEvent[] = [];

  private constructor(
    snapshot: {
      readonly id: string;
      readonly code: string;
      readonly settings: RoomSettingsSnapshot;
      readonly lastConnectedAt: Date;
    },
    host: Player,
    players: readonly Player[],
  ) {
    this.#id = new IdVO(snapshot.id);
    this.#code = new RoomCodeVO(snapshot.code);
    this.#settings = new RoomSettingsVO(snapshot.settings);
    this.#hostId = host.id;
    this.#players = [...players];
    this.#lastConnectedAt = new Date(snapshot.lastConnectedAt);
  }

  /**
   * The room is born with its host, who is its first player, and the configuration of its ambience
   * in the language of the host, and with that dilemma in its first round if it is given one that
   * suits it. A host under 18 creates no room of an ambience for adults.
   */
  static create(props: CreateRoomProps, idGenerator: IdGenerator): Room {
    const ambience = ambienceCalled(props.ambience);
    const id = idGenerator.generate();
    const settings = settingsOf(ambience, keptForANewRoom(props.dilemmaLanguage)).toSnapshot();
    if (props.hostUnderEighteen && settings.adultsOnly) throw new MinorInRoomError(id);
    const host = Player.create(
      {
        nickname: props.hostNickname,
        identity: props.hostIdentity,
        avatar: props.hostAvatar,
        playedDilemmaIds: props.hostPlayedDilemmaIds ?? [],
        underEighteen: props.hostUnderEighteen,
      },
      idGenerator,
    );
    const { code, createdAt } = props;
    const lastConnectedAt = createdAt;
    const room = new Room({ id, code, settings, lastConnectedAt }, host, [host]);
    if (props.firstRoundDilemma) {
      const dilemma = lobbyDilemmaOf(props.firstRoundDilemma);
      if (!room.#suits(dilemma)) throw new DilemmaNotSuitableError(dilemma.dilemmaId);
      const [first, ...rest] = room.#settings.rounds;
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

  /** The dilemmas of the games the room played before, which no other game of the room repeats. */
  get playedDilemmaIds(): readonly string[] {
    return [...this.#playedDilemmaIds];
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
   * A new player joins with the avatar they chose and the dilemmas their device says they played.
   * Whoever is already in the room gets their player back, with what their device says now, so
   * joining twice changes nothing else. Nobody joins a closed room, not even who was in it, and
   * nobody under 18 joins a room for adults.
   */
  join(
    {
      nickname,
      identity,
      avatar,
      playedDilemmaIds = [],
      underEighteen,
    }: {
      readonly nickname: string;
      readonly identity: string;
      readonly avatar: AvatarVO;
      readonly playedDilemmaIds?: readonly string[];
      readonly underEighteen: boolean;
    },
    idGenerator: IdGenerator,
    at: Date,
  ): Player {
    this.#ensureOpenAt(at);
    const existing = this.playerWith(identity);
    if (existing) {
      existing.havePlayed(playedDilemmaIds);
      // Who left the game on purpose comes back as a player, never as the host.
      if (this.#leftPlayerIds.delete(existing.id)) {
        this.#version += 1;
        this.#events.push(new PlayerLeftEvent(this.id, existing.id, false, this.#version));
      }
      return existing;
    }
    if (this.#expelledIdentities.has(identity)) throw new PlayerExpelledError(this.id);
    if (this.#players.length >= MAXIMUM_PLAYERS) throw new RoomFullError(this.id);
    if (underEighteen && this.#settings.adultsOnly) throw new AdultsOnlyRoomError(this.id);

    this.#ensureNobodyLooksTheSame(new NicknameVO(nickname), avatar);

    const player = Player.create(
      { nickname, identity, avatar, playedDilemmaIds, underEighteen },
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
   * The team withdrew the nickname of the player behind that identity: if they go by it here, they
   * take the generic nickname of the room, with their number in it, at any moment of the room.
   * Whether they did.
   */
  withdrawNickname(identity: string, nickname: string): boolean {
    const index = this.#players.findIndex((player) => player.identity === identity);
    const player = this.#players[index];
    if (!player || !new NicknameVO(player.nickname).sameAs(new NicknameVO(nickname))) return false;
    this.#renameGeneric(index);
    this.#changeLobby('nickname-withdrawn');
    return true;
  }

  /**
   * Whoever is behind the player of that identity withdrew the game consent or deleted their data,
   * once they left the room: in it they stay, for the others, under the generic nickname of the
   * room and tied to nobody, and the room forgets it expelled them.
   */
  forget(identity: string): void {
    const wasExpelled = this.#expelledIdentities.delete(identity);
    const index = this.#players.findIndex((player) => player.identity === identity);
    const player = this.#players[index];
    if (!player) {
      if (wasExpelled) this.#version += 1;
      return;
    }
    this.#renameGeneric(index);
    player.forget();
    this.#version += 1;
  }

  /** «Jugador N», with their number in the room, or the next one free if someone looks the same. */
  #renameGeneric(index: number): void {
    const player = this.#players[index] as Player;
    let number = index + 1;
    let generic = new NicknameVO(genericNickname(this.#settings.dilemmaLanguage, number));
    // Someone who wrote «Jugador 3» with the same avatar keeps it: the next number is free.
    while (this.#looksLikeAnother(generic, player.avatar, player.id)) {
      number += 1;
      generic = new NicknameVO(genericNickname(this.#settings.dilemmaLanguage, number));
    }
    player.rename(generic);
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
    const variant = rest.variant ?? this.#settings.variant;
    const adultsOnly = rest.adultsOnly ?? this.#settings.adultsOnly;
    // Making the room nominal turns compromising dilemmas off, and they stay off.
    const compromisingDilemmas =
      variant === 'anonymous' && (rest.compromisingDilemmas ?? this.#settings.compromisingDilemmas);
    if (adultsOnly && !this.#settings.adultsOnly) this.#ensureNobodyUnderEighteen();
    // What the room no longer allows goes back to any in the content of each round.
    const allowedOf = ({ age, compromising }: RoundContent): RoundContent => ({
      age: adultsOnly ? age : 'any',
      compromising: compromisingDilemmas ? compromising : 'any',
    });
    const withoutRounds = this.#settings.with({
      ...rest,
      compromisingDilemmas,
      rounds: current.map((round) =>
        round.origin === 'random' ? { ...round, content: allowedOf(round.content) } : round,
      ),
    });
    const known = [
      ...current.flatMap((round) => (round.origin === 'specific' ? [round.dilemma] : [])),
      ...this.#chosenDilemmas,
    ];
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
        return {
          id,
          origin: 'random',
          categories: change.categories,
          content: allowedOf(change.content ?? ANY_CONTENT),
        };
      }
      if (change.origin === 'players') return { id, origin: 'players' };
      if (this.#playedDilemmaIds.has(change.dilemmaId)) {
        throw new DilemmaAlreadyPlayedError(change.dilemmaId);
      }
      const dilemma = found(change.dilemmaId);
      if (dilemma) return { id, origin: 'specific', dilemma: lobbyDilemmaOf(dilemma) };
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

  /** Whether someone in the room said they are under 18, which keeps out everything for adults. */
  get hasPlayerUnderEighteen(): boolean {
    return this.#players.some((player) => player.underEighteen);
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
    if (this.#playedDilemmaIds.has(dilemma.dilemmaId)) {
      throw new DilemmaAlreadyPlayedError(dilemma.dilemmaId);
    }
    if (!this.#suits(dilemma)) throw new DilemmaNotSuitableError(dilemma.dilemmaId);

    this.#chosenDilemmas.push({ ...lobbyDilemmaOf(dilemma), roundId, playerId });
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
    this.#chosenDilemmas = this.#chosenDilemmas.map((chosen) =>
      chosen.playerId === playerId ? { ...chosen, playerId: null } : chosen,
    );
    this.#expelledIdentities.add(player.identity);
    this.#changeLobby('player-expelled');
  }

  /** The fewest players a game of this room starts with, by its variant. */
  get minimumPlayers(): number {
    return MINIMUM_PLAYERS[this.#settings.variant];
  }

  /** The fewest players a game of this room plays the dilemmas with the gap with, by its variant. */
  get minimumPlayersForTheGap(): number {
    return MINIMUM_PLAYERS_FOR_THE_GAP[this.#settings.variant];
  }

  /** Whether a game started now would play the dilemmas with the gap. */
  get playsTheGap(): boolean {
    return this.#players.length >= this.minimumPlayersForTheGap;
  }

  /** How many players of the room have each dilemma among those they played, by its id. */
  get playedBy(): ReadonlyMap<string, number> {
    const counts = new Map<string, number>();
    for (const player of this.#players) {
      for (const dilemmaId of player.playedDilemmaIds) {
        counts.set(dilemmaId, (counts.get(dilemmaId) ?? 0) + 1);
      }
    }
    return counts;
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
   * Once the game has ended, the host takes who is still in the room to the lobby of a new game,
   * with the same settings, which they may change there. Who left does not go on to it, who was
   * expelled from the lobby before may join it, and no game of the room plays the dilemmas of the
   * games it played again. Whether the game has ended is up to the caller, which knows it.
   */
  startRematch(playerId: string, playedDilemmaIds: readonly string[]): void {
    this.#player(playerId);
    if (playerId !== this.#hostId) throw new NotHostError(playerId);
    if (this.isInLobby) throw new GameNotInProgressError(this.id);

    for (const dilemmaId of playedDilemmaIds) this.#playedDilemmaIds.add(dilemmaId);
    for (const playerId of this.#leftPlayerIds) {
      this.#players.splice(
        this.#players.findIndex(({ id }) => id === playerId),
        1,
      );
    }
    this.#leftPlayerIds.clear();
    this.#expelledIdentities.clear();
    this.#currentGameId = null;
    this.#changeLobby('rematch-started');
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
    const player = this.#player(playerId);
    if (this.isInLobby) {
      this.#leaveLobby(player, at);
      return;
    }
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

  /**
   * From the lobby, who leaves is out of the room, with nothing kept of them, and may join again;
   * the dilemma they chose stays without a chooser. If they were the host, the role passes to who
   * has been in the room longest; the last one to leave closes the room.
   */
  #leaveLobby(player: Player, at: Date): void {
    if (this.#connections.delete(player.id)) this.#connectionClosed(at);
    const successor = this.#players.find(({ id }) => id !== player.id);
    if (!successor) {
      this.#closedAt = new Date(at);
      this.#playerLeft(player.id);
      return;
    }
    this.#players.splice(this.#players.indexOf(player), 1);
    this.#chosenDilemmas = this.#chosenDilemmas.map((chosen) =>
      chosen.playerId === player.id ? { ...chosen, playerId: null } : chosen,
    );
    if (player.id === this.#hostId) this.#changeHost(successor.id);
    if (player.id === this.#absentHostId) this.#absentHostId = null;
    this.#playerLeft(player.id);
  }

  /** Who left on purpose: their connections close, and the others see the room without them. */
  #playerLeft(playerId: string): void {
    this.#version += 1;
    this.#events.push(new PlayerLeftEvent(this.id, playerId, true, this.#version));
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
      playedDilemmaIds: this.playedDilemmaIds,
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
    for (const dilemmaId of snapshot.playedDilemmaIds) room.#playedDilemmaIds.add(dilemmaId);
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
    if (this.#looksLikeAnother(nickname, avatar, playerId)) {
      throw new NicknameAndAvatarTakenError(nickname.value, avatar.face, avatar.color);
    }
  }

  #looksLikeAnother(nickname: NicknameVO, avatar: AvatarVO, playerId?: string): boolean {
    return this.#players.some(
      (other) =>
        other.id !== playerId &&
        other.avatar.equals(avatar) &&
        new NicknameVO(other.nickname).sameAs(nickname),
    );
  }

  /** For the age of the room, and not compromising unless the room includes those. */
  #suits(dilemma: LobbyDilemma, settings: RoomSettingsVO = this.#settings): boolean {
    return (
      dilemma.minimumAge <= settings.maximumMinimumAge &&
      (!dilemma.compromising || settings.compromisingDilemmas)
    );
  }

  #ensureNobodyUnderEighteen(): void {
    if (this.hasPlayerUnderEighteen) throw new MinorInRoomError(this.id);
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

/** What the room keeps of a dilemma of the lobby, and nothing else it may have been given. */
function lobbyDilemmaOf(dilemma: LobbyDilemma): LobbyDilemma {
  const { dilemmaId, type, scale, minimumAge, hasGap, compromising } = dilemma;
  return { dilemmaId, type, scale, minimumAge, hasGap, compromising };
}

/** A round of the settings as the host would set it again, to keep it as it is. */
function toRoundChange(round: RoundSnapshot): RoundChange {
  return round.origin === 'specific'
    ? { id: round.id, origin: 'specific', dilemmaId: round.dilemma.dilemmaId }
    : round;
}

function ambienceCalled(ambience: string): Ambience {
  if (!(AMBIENCES as readonly string[]).includes(ambience)) {
    throw new InvalidRoomSettingError('ambience', ambience);
  }
  return ambience as Ambience;
}
