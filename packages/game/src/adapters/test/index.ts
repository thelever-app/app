/**
 * @thelever-app/game/contracts
 *
 * The tests every adapter of the Game ports must pass, in memory or in PostgreSQL. Only for tests.
 */
export { describeRoomRepositoryContract } from './room-repository.contract.ts';
export { describeGameRepositoryContract } from './game-repository.contract.ts';
export { CONTRACT_DILEMMAS, describeDilemmaCatalogContract } from './dilemma-catalog.contract.ts';
