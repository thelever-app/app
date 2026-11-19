import type { IdGenerator } from '../ports/id-generator.port.ts';
import { AvatarVO } from '../vos/avatar.vo.ts';
import { IdVO } from '../vos/id.vo.ts';
import { NicknameVO } from '../vos/nickname.vo.ts';

export interface PlayerSnapshot {
  readonly id: string;
  readonly nickname: string;
  readonly identity: string;
  readonly avatar: { readonly face: string; readonly color: string };
  /** The dilemmas the device of the player says they played, which the room only puts games together with. */
  readonly playedDilemmaIds: readonly string[];
  /** Whether they were under 18 when they entered the room, by the age they declared. */
  readonly underEighteen: boolean;
}

export class Player {
  readonly #id: IdVO;
  readonly #nickname: NicknameVO;
  /** Who uses the app behind this player. It never travels to the other players. */
  readonly #identity: IdVO;
  #avatar: AvatarVO;
  #playedDilemmaIds: readonly string[];
  readonly #underEighteen: boolean;

  private constructor(
    id: string,
    nickname: string,
    identity: string,
    avatar: AvatarVO,
    playedDilemmaIds: readonly string[],
    underEighteen: boolean,
  ) {
    this.#id = new IdVO(id);
    this.#nickname = new NicknameVO(nickname);
    this.#identity = new IdVO(identity);
    this.#avatar = avatar;
    this.#playedDilemmaIds = [...new Set(playedDilemmaIds)];
    this.#underEighteen = underEighteen;
  }

  static create(
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
  ): Player {
    return new Player(
      idGenerator.generate(),
      nickname,
      identity,
      avatar,
      playedDilemmaIds,
      underEighteen,
    );
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

  /** The dilemmas the device of the player says they played, each once. */
  get playedDilemmaIds(): readonly string[] {
    return [...this.#playedDilemmaIds];
  }

  /** Whether they were under 18 when they entered the room. */
  get underEighteen(): boolean {
    return this.#underEighteen;
  }

  /** The room checks that nobody else has it. */
  wear(avatar: AvatarVO): void {
    this.#avatar = avatar;
  }

  /** What the device says the player played when they enter the room again. */
  havePlayed(dilemmaIds: readonly string[]): void {
    this.#playedDilemmaIds = [...new Set(dilemmaIds)];
  }

  toSnapshot(): PlayerSnapshot {
    return {
      id: this.id,
      nickname: this.nickname,
      identity: this.identity,
      avatar: { face: this.#avatar.face, color: this.#avatar.color },
      playedDilemmaIds: this.playedDilemmaIds,
      underEighteen: this.#underEighteen,
    };
  }

  static restore(snapshot: PlayerSnapshot): Player {
    return new Player(
      snapshot.id,
      snapshot.nickname,
      snapshot.identity,
      new AvatarVO(snapshot.avatar.face, snapshot.avatar.color),
      snapshot.playedDilemmaIds,
      snapshot.underEighteen,
    );
  }
}
