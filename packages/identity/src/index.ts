/**
 * @thelever-app/identity
 *
 * The Identity context: who uses the app, the region of their device and the age they declared
 * in the first access, and when they last opened it.
 */
export {
  FirstAccess,
  type FirstAccessSnapshot,
  type FirstAccessStep,
} from './domain/entities/first-access.ts';
export { ADULT_AGE, DeclaredAgeVO, isBoundaryYear } from './domain/vos/declared-age.vo.ts';
export {
  minimumAgeIn,
  type OpenRegion,
  type Region,
  REGIONS,
  regionOf,
} from './domain/vos/region.vo.ts';
export type { Clock } from './domain/ports/clock.port.ts';
export { AgeAlreadyDeclaredError } from './domain/errors/age-already-declared.error.ts';
export { BlockedCountryError } from './domain/errors/blocked-country.error.ts';
export { InvalidDeclaredAgeError } from './domain/errors/invalid-declared-age.error.ts';
export { MonthOfBirthNeededError } from './domain/errors/month-of-birth-needed.error.ts';
export type { FirstAccessRepository } from './application/ports/first-access-repository.port.ts';
export type { FirstAccessView } from './application/first-access-view.ts';
export { FirstAccessNotBegunError } from './application/errors/first-access-not-begun.error.ts';
export { OpenAppUseCase, type OpenAppInput } from './application/use-cases/open-app.use-case.ts';
export {
  DeclareAgeUseCase,
  type DeclareAgeInput,
} from './application/use-cases/declare-age.use-case.ts';
export {
  type GetFirstAccess,
  GetFirstAccessUseCase,
} from './application/use-cases/get-first-access.use-case.ts';
