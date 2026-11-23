/**
 * @thelever-app/consent/published
 *
 * The published language of the Consent context: all another context may use of it (ADR 0001).
 * Plain data and the interface of its query; its domain stays inside.
 */
export type { GetConsent } from './application/use-cases/get-consent.use-case.ts';
export type { ConsentView } from './application/consent-view.ts';
export type { LegalDocument } from './domain/vos/legal-document.vo.ts';
export type { ObjectsToAnalytics } from './application/use-cases/objects-to-analytics.use-case.ts';
export type {
  ConsentData,
  EraseConsentData,
  ExportConsentData,
} from './application/use-cases/consent-personal-data.use-case.ts';
