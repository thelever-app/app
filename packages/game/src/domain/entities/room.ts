import { HostMissingError } from '../errors/host-missing.error.ts';
import { IdVO } from '../vos/id.vo.ts';
import { Player } from './player.ts';

export class Room {
  readonly #id: IdVO;
  readonly #host: Player;
  readonly #players: Player[] = [];
  readonly #playersIds: Set<string> = new Set<string>();

  constructor(id: string, host: Player) {
    if (!host) throw new HostMissingError();

    this.#id = new IdVO(id);
    this.#host = host;
    this.addPlayer(host);
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
}
