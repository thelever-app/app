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
  /** In the order they joined, which decides who takes over as host. */
  readonly #players: Player[];

  private constructor(id: string, host: Player, players: readonly Player[]) {
    this.#id = new IdVO(id);
    this.#host = host;
    this.#players = [...players];
  }

  /** The room is born with its host, who is its first player. */
  static create(
    { hostNickname }: { readonly hostNickname: string },
    idGenerator: IdGenerator,
  ): Room {
    const id = idGenerator.generate();
    const host = Player.create({ nickname: hostNickname }, idGenerator);
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

  addPlayer(player: Player): void {
    if (this.#players.some((existing) => existing.id === player.id)) {
      return;
    }
    this.#players.push(player);
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

    return new Room(snapshot.id, host, players);
  }
}
