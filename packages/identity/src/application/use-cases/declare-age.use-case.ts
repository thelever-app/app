import type { Clock } from '../../domain/ports/clock.port.ts';
import { FirstAccessNotBegunError } from '../errors/first-access-not-begun.error.ts';
import { type FirstAccessView, viewOf } from '../first-access-view.ts';
import type { FirstAccessRepository } from '../ports/first-access-repository.port.ts';

export interface DeclareAgeInput {
  readonly identity: string;
  readonly birthYear: number;
  /** Only needed in a boundary year: without it there, MonthOfBirthNeededError. */
  readonly birthMonth?: number;
}

/** Whoever opened the app declares their age, once and for good. */
export class DeclareAgeUseCase {
  readonly #repository: FirstAccessRepository;
  readonly #clock: Clock;

  constructor(repository: FirstAccessRepository, clock: Clock) {
    this.#repository = repository;
    this.#clock = clock;
  }

  async execute({ identity, birthYear, birthMonth }: DeclareAgeInput): Promise<FirstAccessView> {
    const firstAccess = await this.#repository.findByIdentity(identity);
    if (!firstAccess) throw new FirstAccessNotBegunError(identity);
    const now = this.#clock.now();
    firstAccess.declareAge(birthYear, birthMonth, now);
    await this.#repository.save(firstAccess);
    return viewOf(firstAccess, now);
  }
}
