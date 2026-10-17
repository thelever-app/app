import type { IdGenerator } from '../ports/id-generator.port.ts';
import { IdVO } from '../vos/id.vo.ts';
import { NicknameVO } from '../vos/nickname.vo.ts';

export interface PlayerSnapshot {
  readonly id: string;
  readonly nickname: string;
}

export class Player {
  readonly #id: IdVO;
  readonly #nickname: NicknameVO;

  private constructor(id: string, nickname: string) {
    this.#id = new IdVO(id);
    this.#nickname = new NicknameVO(nickname);
  }

  static create({ nickname }: { readonly nickname: string }, idGenerator: IdGenerator): Player {
    return new Player(idGenerator.generate(), nickname);
  }

  get id(): string {
    return this.#id.value;
  }

  get nickname(): string {
    return this.#nickname.value;
  }

  toSnapshot(): PlayerSnapshot {
    return { id: this.id, nickname: this.nickname };
  }

  static restore(snapshot: PlayerSnapshot): Player {
    return new Player(snapshot.id, snapshot.nickname);
  }
}
