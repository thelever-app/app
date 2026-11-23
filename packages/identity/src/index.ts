/**
 * @thelever-app/identity
 *
 * The Identity context: who uses the app, the region of their device and the age they declared
 * in the first access, when they last opened it, and the rights over their data: the code for
 * requests by email, the deletion log and the personal data stores it goes through.
 */
export {
  FirstAccess,
  type FirstAccessSnapshot,
  type FirstAccessStep,
} from './domain/entities/first-access.ts';
export { ADULT_AGE, DeclaredAgeVO, needsMonthOfBirth } from './domain/vos/declared-age.vo.ts';
export {
  minimumAgeIn,
  type OpenRegion,
  type Region,
  REGIONS,
  regionOf,
} from './domain/vos/region.vo.ts';
export {
  DataDeletion,
  type DataDeletionSnapshot,
  DELETION_REASONS,
  type DeletionReason,
} from './domain/entities/data-deletion.ts';
export { RequestCodeVO } from './domain/vos/request-code.vo.ts';
export type { Clock } from './domain/ports/clock.port.ts';
export type { IdGenerator } from './domain/ports/id-generator.port.ts';
export type { Randomness } from './domain/ports/randomness.port.ts';
export { AgeAlreadyDeclaredError } from './domain/errors/age-already-declared.error.ts';
export { BlockedCountryError } from './domain/errors/blocked-country.error.ts';
export { InvalidDeclaredAgeError } from './domain/errors/invalid-declared-age.error.ts';
export { MonthOfBirthNeededError } from './domain/errors/month-of-birth-needed.error.ts';
export type { FirstAccessRepository } from './application/ports/first-access-repository.port.ts';
export type { DataDeletionRepository } from './application/ports/data-deletion-repository.port.ts';
export type {
  GameDataOfIdentity,
  PersonalDataStore,
} from './application/ports/personal-data-store.port.ts';
export { FirstAccessPersonalData } from './application/personal-data/first-access-personal-data.ts';
export { RequestCodeUnavailableError } from './application/errors/request-code-unavailable.error.ts';
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
export { GetRequestCodeUseCase } from './application/use-cases/get-request-code.use-case.ts';
export { IdentityOfRequestCodeUseCase } from './application/use-cases/identity-of-request-code.use-case.ts';
export { RequestDataDeletionUseCase } from './application/use-cases/request-data-deletion.use-case.ts';
export {
  type LogGameConsentWithdrawal,
  LogGameConsentWithdrawalUseCase,
} from './application/use-cases/log-game-consent-withdrawal.use-case.ts';
export { DeletionsToEraseUseCase } from './application/use-cases/deletions-to-erase.use-case.ts';
export { ErasePersonalDataUseCase } from './application/use-cases/erase-personal-data.use-case.ts';
export { ExportPersonalDataUseCase } from './application/use-cases/export-personal-data.use-case.ts';
export {
  type CarryOutDataRequestInput,
  CarryOutDataRequestUseCase,
  type DataRequestOutcome,
  type DataRequestProof,
} from './application/use-cases/carry-out-data-request.use-case.ts';
export type { IdentitiesOfEmail } from './application/ports/identities-of-email.port.ts';
export { NOT_CARRIED_OUT_REPLY } from './application/texts/data-request-texts.ts';
