import { VoteVO } from './vote.vo.ts';

/**
 * The vote plus the predictions the room variant requires.
 * Only the vote for now: predictions arrive with the nominal room.
 */
export class AnswerVO {
  readonly #vote: VoteVO;

  constructor(vote: string) {
    this.#vote = new VoteVO(vote);
  }

  get vote(): string {
    return this.#vote.value;
  }
}
