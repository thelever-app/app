import { HostMissingError } from '../errors/host-missing.error.ts';
import type { IdGenerator } from '../ports/id-generator.port.ts';
import { IdVO } from '../vos/id.vo.ts';
import { Player, type PlayerSnapshot } from './player.ts';

export interface RoomSnapshot {
  readonly id: string;
  readonly hostId: string;
  readonly players: readonly PlayerSnapshot[];
}

export class Room {
  readonly #id: IdVO;
  readonly #host: Player;
  readonly #players: Player[] = [];
  readonly #playersIds: Set<string> = new Set<string>();

  private constructor(id: string, host: Player) {
    this.#id = new IdVO(id);
    this.#host = host;
    this.addPlayer(host);
  }

  /** The room is born with its host, who is its first player. */
  static create(
    { hostNickname }: { readonly hostNickname: string },
    idGenerator: IdGenerator,
  ): Room {
    const id = idGenerator.generate();
    const host = Player.create({ nickname: hostNickname }, idGenerator);
    return new Room(id, host);
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

  addPlayer(player: Player): void {
    if (this.#playersIds.has(player.id)) {
      return;
    }
    this.#players.push(player);
    this.#playersIds.add(player.id);
  }

  toSnapshot(): RoomSnapshot {
    return {
      id: this.id,
      hostId: this.#host.id,
      players: this.#players.map((player) => player.toSnapshot()),
    };
  }

  static restore(snapshot: RoomSnapshot): Room {
    const players = snapshot.players.map((player) => Player.restore(player));
    const host = players.find((player) => player.id === snapshot.hostId);
    if (!host) throw new HostMissingError();

    const room = new Room(snapshot.id, host);
    // The constructor puts the host first; the snapshot keeps the order in which players joined.
    room.#players.splice(0);
    room.#playersIds.clear();
    for (const player of players) room.addPlayer(player);
    return room;
  }
}
