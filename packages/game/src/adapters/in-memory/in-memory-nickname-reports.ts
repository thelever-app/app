import type {
  NicknameReport,
  NicknameReports,
} from '../../application/ports/nickname-reports.port.ts';

/** Keeps the reports of nicknames it gets, in order, for tests and the simulated room. */
export class InMemoryNicknameReports implements NicknameReports {
  readonly #reports: NicknameReport[] = [];

  async report(report: NicknameReport): Promise<void> {
    this.#reports.push({ ...report });
  }

  get reports(): readonly NicknameReport[] {
    return this.#reports.map((report) => ({ ...report }));
  }
}
