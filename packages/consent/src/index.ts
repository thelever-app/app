/**
 * @thelever-app/consent
 *
 * The Consent context: the legal documents the first access asks for, in their versions, and the
 * version each identity accepted. In the MVP, only the terms of use and the game consent; the
 * research consent and the gate of the research events come with the dataset.
 */
export {
  Acceptances,
  type Acceptance,
  type AcceptancesSnapshot,
} from './domain/entities/acceptances.ts';
export {
  currentVersionOf,
  LEGAL_DOCUMENTS,
  type LegalDocument,
  type LegalDocumentVersion,
  PUBLISHED_VERSIONS,
  type PublishedVersions,
  versionRequiredOf,
} from './domain/vos/legal-document.vo.ts';
export type { Clock } from './domain/ports/clock.port.ts';
export { NotCurrentVersionError } from './domain/errors/not-current-version.error.ts';
export type { AcceptanceRepository } from './application/ports/acceptance-repository.port.ts';
export type { ConsentView } from './application/consent-view.ts';
export {
  AcceptDocumentUseCase,
  type AcceptDocumentInput,
} from './application/use-cases/accept-document.use-case.ts';
export {
  type GetConsent,
  GetConsentUseCase,
} from './application/use-cases/get-consent.use-case.ts';
