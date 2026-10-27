import type { IdGenerator } from '../ports/id-generator.port.ts';
import { IdVO } from '../vos/id.vo.ts';
import { NicknameVO } from '../vos/nickname.vo.ts';

export interface PlayerSnapshot {
  readonly id: string;
  readonly nickname: string;
  readonly identity: string;
}

export class Player {
  readonly #id: IdVO;
  readonly #nickname: NicknameVO;
  /** Who uses the app behind this player. It never travels to the other players. */
  readonly #identity: IdVO;

  private constructor(id: string, nickname: string, identity: string) {
    this.#id = new IdVO(id);
    this.#nickname = new NicknameVO(nickname);
    this.#identity = new IdVO(identity);
  }

  static create(
    { nickname, identity }: { readonly nickname: string; readonly identity: string },
    idGenerator: IdGenerator,
  ): Player {
    return new Player(idGenerator.generate(), nickname, identity);
  }

  get id(): string {
    return this.#id.value;
  }

  get nickname(): string {
    return this.#nickname.value;
  }

  get identity(): string {
    return this.#identity.value;
  }

  toSnapshot(): PlayerSnapshot {
    return { id: this.id, nickname: this.nickname, identity: this.identity };
  }

  static restore(snapshot: PlayerSnapshot): Player {
    return new Player(snapshot.id, snapshot.nickname, snapshot.identity);
  }
}
