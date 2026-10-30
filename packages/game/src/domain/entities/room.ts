import { HostMissingError } from '../errors/host-missing.error.ts';
import { PlayerNotInRoomError } from '../errors/player-not-in-room.error.ts';
import { ConnectionChangedEvent } from '../events/connection-changed.event.ts';
import type { DomainEvent } from '../events/domain-event.ts';
import type { IdGenerator } from '../ports/id-generator.port.ts';
import { IdVO } from '../vos/id.vo.ts';
import { Player, type PlayerSnapshot } from './player.ts';

export interface RoomSnapshot {
  readonly id: string;
  readonly hostId: string;
  readonly players: readonly PlayerSnapshot[];
  readonly version: number;
  /** Every open connection of each connected player. */
  readonly connections: readonly { readonly playerId: string; readonly connectionId: string }[];
}

export class Room {
  readonly #id: IdVO;
  readonly #host: Player;
  /** In the order they joined, which decides who takes over as host. */
  readonly #players: Player[];
  /** Goes up every time a player connects or disconnects, apart from the version of the game. */
  #version = 0;
  /** The ids of the open connections of each player; a player without any is disconnected. */
  readonly #connections = new Map<string, Set<string>>();
  #events: DomainEvent[] = [];

  private constructor(id: string, host: Player, players: readonly Player[]) {
    this.#id = new IdVO(id);
    this.#host = host;
    this.#players = [...players];
  }

  /** The room is born with its host, who is its first player. */
  static create(
    {
      hostNickname,
      hostIdentity,
    }: { readonly hostNickname: string; readonly hostIdentity: string },
    idGenerator: IdGenerator,
  ): Room {
    const id = idGenerator.generate();
    const host = Player.create({ nickname: hostNickname, identity: hostIdentity }, idGenerator);
    return new Room(id, host, [host]);
  }

  get id(): string {
    return this.#id.value;
  }

  get host(): Player {
    return this.#host;
  }

  get players(): readonly Player[] {
    return [...this.#players];
  }

  get version(): number {
    return this.#version;
  }

  /** A player already in the room, by id or by identity, is not added again. */
  addPlayer(player: Player): void {
    if (
      this.#players.some(
        (existing) => existing.id === player.id || existing.identity === player.identity,
      )
    ) {
      return;
    }
    this.#players.push(player);
  }

  /** The player of the room behind that identity, if any. */
  playerWith(identity: string): Player | undefined {
    return this.#players.find((player) => player.identity === identity);
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
    if (!this.#players.some((player) => player.id === playerId)) {
      throw new PlayerNotInRoomError(playerId);
    }
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
      hostId: this.#host.id,
      players: this.#players.map((player) => player.toSnapshot()),
      version: this.#version,
      connections: [...this.#connections].flatMap(([playerId, open]) =>
        [...open].map((connectionId) => ({ playerId, connectionId })),
      ),
    };
  }

  static restore(snapshot: RoomSnapshot): Room {
    const players = snapshot.players.map((player) => Player.restore(player));
    const host = players.find((player) => player.id === snapshot.hostId);
    if (!host) throw new HostMissingError();

    const room = new Room(snapshot.id, host, players);
    room.#version = snapshot.version;
    for (const { playerId, connectionId } of snapshot.connections) {
      const open = room.#connections.get(playerId) ?? new Set();
      open.add(new IdVO(connectionId).value);
      room.#connections.set(playerId, open);
    }
    return room;
  }

  #changeConnection(playerId: string, connected: boolean): void {
    this.#version += 1;
    this.#events.push(new ConnectionChangedEvent(this.id, playerId, connected, this.#version));
  }
}
