/**
 * @thelever-app/consent/published
 *
 * The published language of the Consent context: all another context may use of it (ADR 0001).
 * Plain data and the interface of its query; its domain stays inside.
 */
export type { GetConsent } from './application/use-cases/get-consent.use-case.ts';
export type { ConsentView } from './application/consent-view.ts';
export type { LegalDocument } from './domain/vos/legal-document.vo.ts';
