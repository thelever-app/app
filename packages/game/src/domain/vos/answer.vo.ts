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

/** The vote a player believes another one chose. */
export interface VotePrediction {
  readonly playerId: string;
  readonly vote: string;
}

export interface AnswerProps {
  readonly vote: string;
  /** Only the ones the voter made, in a nominal room. */
  readonly votePredictions: readonly VotePrediction[];
  /** The options of the dilemma in the order the voter saw them. */
  readonly optionOrder: readonly string[];
  /** From when the voter got the dilemma to when they first completed the answer; null until then. */
  readonly responseTimeMs: number | null;
  readonly seal: Seal;
  /** Whether the dilemma was about the voter, through the gap "someone in the group". */
  readonly voterInTheGap: boolean;
}

/**
 * The vote plus the predictions the room variant requires, with what is recorded alongside it.
 * Whether it is complete depends on the variant and the players of the game, which the game knows.
 */
export class AnswerVO {
  readonly #vote: VoteVO;
  readonly #props: AnswerProps;

  constructor(props: AnswerProps) {
    this.#vote = new VoteVO(props.vote);
    this.#props = {
      ...props,
      vote: this.#vote.value,
      votePredictions: props.votePredictions.map(({ playerId, vote }) => ({
        playerId,
        vote: new VoteVO(vote).value,
      })),
      optionOrder: [...props.optionOrder],
      seal: { ...props.seal },
    };
  }

  get vote(): string {
    return this.#vote.value;
  }

  get votePredictions(): readonly VotePrediction[] {
    return this.#props.votePredictions.map((prediction) => ({ ...prediction }));
  }

  get optionOrder(): readonly string[] {
    return [...this.#props.optionOrder];
  }

  get responseTimeMs(): number | null {
    return this.#props.responseTimeMs;
  }

  get seal(): Seal {
    return { ...this.#props.seal };
  }

  get voterInTheGap(): boolean {
    return this.#props.voterInTheGap;
  }

  /** The same answer, now with the time it took to complete it. */
  completedIn(responseTimeMs: number): AnswerVO {
    return new AnswerVO({ ...this.#props, responseTimeMs });
  }

  toProps(): AnswerProps {
    return {
      ...this.#props,
      votePredictions: this.votePredictions,
      optionOrder: this.optionOrder,
      seal: this.seal,
    };
  }
}
