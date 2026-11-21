/**
 * @thelever-app/moderation/contracts
 *
 * The tests every adapter of the Moderation ports must pass, in memory or in PostgreSQL. Only for
 * tests.
 */
export {
  describeDilemmaReportRepositoryContract,
  type DilemmaReportRepositorySubject,
  type ReportableDilemma,
} from './dilemma-report-repository.contract.ts';
