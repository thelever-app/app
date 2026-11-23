/**
 * @thelever-app/consent
 *
 * The Consent context: the legal documents the first access asks for, in their versions, and the
 * version each identity accepted or withdrew; and who objects to product analytics. In the MVP, only the terms of use and the game consent; the
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
export { NotWithdrawableError } from './domain/errors/not-withdrawable.error.ts';
export type { AcceptanceRepository } from './application/ports/acceptance-repository.port.ts';
export type { AnalyticsObjectionRepository } from './application/ports/analytics-objection-repository.port.ts';
export type { AnalyticsEvents } from './application/ports/analytics-events.port.ts';
export type { DeletionLog } from './application/ports/deletion-log.port.ts';
export type { GameData } from './application/ports/game-data.port.ts';
export type { ConsentView } from './application/consent-view.ts';
export {
  AcceptDocumentUseCase,
  type AcceptDocumentInput,
} from './application/use-cases/accept-document.use-case.ts';
export {
  type GetConsent,
  GetConsentUseCase,
} from './application/use-cases/get-consent.use-case.ts';
export { WithdrawGameConsentUseCase } from './application/use-cases/withdraw-game-consent.use-case.ts';
export { ObjectToAnalyticsUseCase } from './application/use-cases/object-to-analytics.use-case.ts';
export { LiftAnalyticsObjectionUseCase } from './application/use-cases/lift-analytics-objection.use-case.ts';
export {
  type ObjectsToAnalytics,
  ObjectsToAnalyticsUseCase,
} from './application/use-cases/objects-to-analytics.use-case.ts';
export {
  type ConsentData,
  type EraseConsentData,
  EraseConsentDataUseCase,
  type ExportConsentData,
  ExportConsentDataUseCase,
} from './application/use-cases/consent-personal-data.use-case.ts';
