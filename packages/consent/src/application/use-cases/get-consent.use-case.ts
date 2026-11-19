import type { PublishedVersions } from '../../domain/vos/legal-document.vo.ts';
import { type ConsentView, viewOf } from '../consent-view.ts';
import type { AcceptanceRepository } from '../ports/acceptance-repository.port.ts';

/** What an identity has accepted, and what it still has to accept before playing. */
export interface GetConsent {
  execute(identity: string): Promise<ConsentView>;
}

export class GetConsentUseCase implements GetConsent {
  readonly #repository: AcceptanceRepository;
  readonly #published: PublishedVersions;

  constructor(repository: AcceptanceRepository, published: PublishedVersions) {
    this.#repository = repository;
    this.#published = published;
  }

  async execute(identity: string): Promise<ConsentView> {
    return viewOf(await this.#repository.findByIdentity(identity), this.#published);
  }
}
