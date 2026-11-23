/**
 * @thelever-app/consent/in-memory
 *
 * In-memory adapters of the Consent ports, for acceptance tests and the room server without a
 * database. Never for production.
 */
export { InMemoryAcceptanceRepository } from './in-memory-acceptance-repository.ts';
export { InMemoryAnalyticsObjectionRepository } from './in-memory-analytics-objection-repository.ts';
