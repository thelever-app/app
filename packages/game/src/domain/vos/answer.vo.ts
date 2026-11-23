import { DistributionPredictionVO, type PredictedShare } from './distribution-prediction.vo.ts';
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
  /**
   * Whether the player objects to product analytics: then neither the time they took to answer nor
   * the time the group spent on the reveal is kept (RES-21).
   */
  readonly objectsToAnalytics: boolean;
}

/** The vote a player believes another one chose. */
export interface VotePrediction {
  readonly playerId: string;
  readonly vote: string;
}

export interface AnswerProps {
  /** Null only for the person in the gap, who does not vote the dilemma about them. */
  readonly vote: string | null;
  /** Only the ones the voter made, in a nominal room. */
  readonly votePredictions: readonly VotePrediction[];
  /** In an anonymous room, the share of the group the voter believes chose each option; null in a nominal one. */
  readonly distributionPrediction: readonly PredictedShare[] | null;
  /** In an anonymous room, whether the voter pressed Ready on their distribution prediction. */
  readonly ready: boolean;
  /** The options of the dilemma in the order the voter saw them. */
  readonly optionOrder: readonly string[];
  /** From when the voter got the dilemma to when they first completed the answer; null until then. */
  readonly responseTimeMs: number | null;
  /** The language the voter read the dilemma in; null for answers from before it was kept. */
  readonly language: string | null;
  readonly seal: Seal;
}

/**
 * The vote plus the predictions the room variant requires, with what is recorded alongside it; the
 * person in the gap answers with the predictions alone.
 * Whether it is complete depends on the variant and the players of the game, which the game knows.
 */
export class AnswerVO {
  readonly #vote: VoteVO | null;
  readonly #distributionPrediction: DistributionPredictionVO | null;
  readonly #props: AnswerProps;

  constructor(props: AnswerProps) {
    this.#vote = props.vote === null ? null : new VoteVO(props.vote);
    this.#distributionPrediction =
      props.distributionPrediction === null
        ? null
        : new DistributionPredictionVO(props.distributionPrediction);
    this.#props = {
      ...props,
      vote: this.#vote?.value ?? null,
      votePredictions: props.votePredictions.map(({ playerId, vote }) => ({
        playerId,
        vote: new VoteVO(vote).value,
      })),
      distributionPrediction: this.#distributionPrediction?.shares ?? null,
      optionOrder: [...props.optionOrder],
      seal: { ...props.seal },
    };
  }

  get vote(): string | null {
    return this.#vote?.value ?? null;
  }

  get votePredictions(): readonly VotePrediction[] {
    return this.#props.votePredictions.map((prediction) => ({ ...prediction }));
  }

  get distributionPrediction(): DistributionPredictionVO | null {
    return this.#distributionPrediction;
  }

  get ready(): boolean {
    return this.#props.ready;
  }

  get optionOrder(): readonly string[] {
    return [...this.#props.optionOrder];
  }

  get responseTimeMs(): number | null {
    return this.#props.responseTimeMs;
  }

  get language(): string | null {
    return this.#props.language;
  }

  get seal(): Seal {
    return { ...this.#props.seal };
  }

  /** The same answer, without the predictions of the vote of that player. */
  withoutPredictionsAbout(playerId: string): AnswerVO {
    return new AnswerVO({
      ...this.toProps(),
      votePredictions: this.votePredictions.filter(
        (prediction) => prediction.playerId !== playerId,
      ),
    });
  }

  /** The same answer, now with the time it took to complete it. */
  completedIn(responseTimeMs: number): AnswerVO {
    return new AnswerVO({ ...this.#props, responseTimeMs });
  }

  toProps(): AnswerProps {
    return {
      ...this.#props,
      votePredictions: this.votePredictions,
      distributionPrediction: this.#distributionPrediction?.shares ?? null,
      optionOrder: this.optionOrder,
      seal: this.seal,
    };
  }
}
