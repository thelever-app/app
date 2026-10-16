import { IdVO } from '../vos/id.vo.ts';
import { NicknameVO } from '../vos/nickname.vo.ts';

export class Player {
  readonly #id: IdVO;
  readonly #nickname: NicknameVO;

  constructor(id: string, nickname: string) {
    this.#id = new IdVO(id);
    this.#nickname = new NicknameVO(nickname);
  }

  get id(): string {
    return this.#id.value;
  }

  get nickname(): string {
    return this.#nickname.value;
  }
}
