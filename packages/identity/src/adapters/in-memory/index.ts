/**
 * @thelever-app/identity/in-memory
 *
 * In-memory adapters of the Identity ports, for acceptance tests and the room server without a
 * database. Never for production.
 */
export { InMemoryDataDeletionRepository } from './in-memory-data-deletion-repository.ts';
export { InMemoryFirstAccessRepository } from './in-memory-first-access-repository.ts';
