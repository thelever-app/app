import type { Clock } from '../../domain/ports/clock.port.ts';
import type { LegalDocument, PublishedVersions } from '../../domain/vos/legal-document.vo.ts';
import { type ConsentView, viewOf } from '../consent-view.ts';
import type { AcceptanceRepository } from '../ports/acceptance-repository.port.ts';

export interface AcceptDocumentInput {
  readonly identity: string;
  readonly document: LegalDocument;
  /** The version the app showed, which has to be the current one. */
  readonly version: number;
}

/** Someone accepts the terms of use, or gives the game consent, in the version they read. */
export class AcceptDocumentUseCase {
  readonly #repository: AcceptanceRepository;
  readonly #published: PublishedVersions;
  readonly #clock: Clock;

  constructor(repository: AcceptanceRepository, published: PublishedVersions, clock: Clock) {
    this.#repository = repository;
    this.#published = published;
    this.#clock = clock;
  }

  async execute({ identity, document, version }: AcceptDocumentInput): Promise<ConsentView> {
    const acceptances = await this.#repository.findByIdentity(identity);
    acceptances.accept(document, version, this.#published, this.#clock.now());
    await this.#repository.save(acceptances);
    return viewOf(acceptances, this.#published);
  }
}
