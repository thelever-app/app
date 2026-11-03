import { VoteVO } from './vote.vo.ts';

/**
 * Saved with each answer: the version of each consent in force when it was given and whether
 * the player was under 18. The game keeps it as it comes, without reading it.
 */
export interface Seal {
  readonly gameConsentVersion: string;
  readonly researchConsentVersion: string | null;
  readonly commercialLicenceConsentVersion: string | null;
  readonly underEighteen: boolean;
}

/**
 * The vote plus the predictions the room variant requires, with its seal.
 * Only the vote for now: predictions arrive with the nominal room.
 */
export class AnswerVO {
  readonly #vote: VoteVO;
  readonly #seal: Seal;
  readonly #voterInTheGap: boolean;

  constructor(vote: string, seal: Seal, voterInTheGap: boolean) {
    this.#vote = new VoteVO(vote);
    this.#seal = { ...seal };
    this.#voterInTheGap = voterInTheGap;
  }

  get vote(): string {
    return this.#vote.value;
  }

  get seal(): Seal {
    return { ...this.#seal };
  }

  /** Whether the dilemma was about the voter, through the gap "someone in the group". */
  get voterInTheGap(): boolean {
    return this.#voterInTheGap;
  }
}
