import type { Logger } from '@thelever-app/db';
import type { DilemmaReport, DilemmaReportRepository } from '@thelever-app/moderation';

/**
 * Logs each report it keeps, which the alert of the reported dilemmas counts: the dilemma, its
 * version and the reason, never who made it nor what they wrote, so neither reaches the logs nor
 * the email of the alert. The line is written before the command commits: a command that fails
 * after the report is saved leaves a line for a report that is not there, which costs one email
 * whose query finds nothing.
 */
export class LoggedDilemmaReports implements DilemmaReportRepository {
  readonly #reports: DilemmaReportRepository;
  readonly #logger: Logger;

  constructor(reports: DilemmaReportRepository, logger: Logger) {
    this.#reports = reports;
    this.#logger = logger;
  }

  async save(report: DilemmaReport): Promise<void> {
    await this.#reports.save(report);
    const { dilemmaId, version, reason } = report.toSnapshot();
    this.#logger.info('dilemma reported', { dilemmaId, version, reason });
  }

  reportsOf(dilemmaId: string): Promise<DilemmaReport[]> {
    return this.#reports.reportsOf(dilemmaId);
  }
}
