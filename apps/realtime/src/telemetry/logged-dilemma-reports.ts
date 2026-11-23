import type { Logger } from '@thelever-app/db';
import type {
  ReceiveDilemmaReport,
  ReceiveDilemmaReportInput,
} from '@thelever-app/moderation/published';

/**
 * Logs each report Moderation receives, which the alert of the reported dilemmas counts: the
 * dilemma, its version and the reason, never who made it nor what they wrote, so neither reaches
 * the logs nor the email of the alert. A report Moderation turns down is not logged. The line is
 * written before the command commits: a command that fails after the report is received leaves a
 * line for a report that is not there, which costs one email whose query finds nothing.
 */
export class LoggedDilemmaReports implements ReceiveDilemmaReport {
  readonly #receive: ReceiveDilemmaReport;
  readonly #logger: Logger;

  constructor(receive: ReceiveDilemmaReport, logger: Logger) {
    this.#receive = receive;
    this.#logger = logger;
  }

  async execute(input: ReceiveDilemmaReportInput): Promise<void> {
    await this.#receive.execute(input);
    const { dilemmaId, version, reason } = input;
    this.#logger.info('dilemma reported', { dilemmaId, version, reason });
  }
}
