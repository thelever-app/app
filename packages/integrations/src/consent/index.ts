/**
 * @thelever-app/integrations/consent
 *
 * What the Consent context gets from the other contexts: adapters of its ports on top of what each
 * of them publishes (ADR 0001).
 */
export { AnalyticsEventsInAnalytics } from './analytics-events-in-analytics.ts';
export { DeletionLogInIdentity } from './deletion-log-in-identity.ts';
export { GameDataInGame } from './game-data-in-game.ts';
