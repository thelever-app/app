import { ballotOf } from '../ballot.ts';
import { AlreadyVotedError } from '../errors/already-voted.error.ts';
import { openByLink } from '../open-by-link.ts';
import type { DilemmaRepository } from '../ports/dilemma-repository.port.ts';
import type { WorldResultRepository } from '../ports/world-result-repository.port.ts';

export interface VoteAloneInput {
  /** Who votes, which is kept to count them once and never with what they voted. */
  readonly identity: string;
  /** The dilemma, by the public id of the link that opened it, in its language. */
  readonly publicId: string;
  readonly optionId: string;
}

/**
 * Counts a vote alone for the world result of the dilemma, with those of its translations: once
 * for each identity and version of the original (AlreadyVotedError the second time). Only for a
 * dilemma a link of the public web leads to (DilemmaNotFoundError) and one of its options
 * (UnknownOptionError). The vote is not seen until the results are published.
 */
export class VoteAloneUseCase {
  readonly #dilemmaRepository: DilemmaRepository;
  readonly #worldResults: WorldResultRepository;

  constructor(dilemmaRepository: DilemmaRepository, worldResults: WorldResultRepository) {
    this.#dilemmaRepository = dilemmaRepository;
    this.#worldResults = worldResults;
  }

  async execute({ identity, publicId, optionId }: VoteAloneInput): Promise<void> {
    const ballot = ballotOf(await openByLink(this.#dilemmaRepository, publicId), optionId);
    if (!(await this.#worldResults.countVote(identity, ballot))) {
      throw new AlreadyVotedError(ballot.dilemmaId, ballot.version);
    }
  }
}
