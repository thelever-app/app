import type {
  DilemmaReport,
  DilemmaReports,
} from '../../application/ports/dilemma-reports.port.ts';

/** Keeps the reports it gets, in order, for tests and the simulated room. */
export class InMemoryDilemmaReports implements DilemmaReports {
  readonly #reports: DilemmaReport[] = [];

  async report(report: DilemmaReport): Promise<void> {
    this.#reports.push({ ...report });
  }

  get reports(): readonly DilemmaReport[] {
    return this.#reports.map((report) => ({ ...report }));
  }
}
