import type { IdGenerator } from '../ports/id-generator.port.ts';
import { AvatarVO } from '../vos/avatar.vo.ts';
import { IdVO } from '../vos/id.vo.ts';
import { NicknameVO } from '../vos/nickname.vo.ts';

export interface PlayerSnapshot {
  readonly id: string;
  readonly nickname: string;
  readonly identity: string;
  readonly avatar: { readonly face: string; readonly color: string };
}

export class Player {
  readonly #id: IdVO;
  readonly #nickname: NicknameVO;
  /** Who uses the app behind this player. It never travels to the other players. */
  readonly #identity: IdVO;
  #avatar: AvatarVO;

  private constructor(id: string, nickname: string, identity: string, avatar: AvatarVO) {
    this.#id = new IdVO(id);
    this.#nickname = new NicknameVO(nickname);
    this.#identity = new IdVO(identity);
    this.#avatar = avatar;
  }

  static create(
    {
      nickname,
      identity,
      avatar,
    }: { readonly nickname: string; readonly identity: string; readonly avatar: AvatarVO },
    idGenerator: IdGenerator,
  ): Player {
    return new Player(idGenerator.generate(), nickname, identity, avatar);
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

  get avatar(): AvatarVO {
    return this.#avatar;
  }

  /** The room checks that nobody else has it. */
  wear(avatar: AvatarVO): void {
    this.#avatar = avatar;
  }

  toSnapshot(): PlayerSnapshot {
    return {
      id: this.id,
      nickname: this.nickname,
      identity: this.identity,
      avatar: { face: this.#avatar.face, color: this.#avatar.color },
    };
  }

  static restore(snapshot: PlayerSnapshot): Player {
    return new Player(
      snapshot.id,
      snapshot.nickname,
      snapshot.identity,
      new AvatarVO(snapshot.avatar.face, snapshot.avatar.color),
    );
  }
}
