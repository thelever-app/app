import type { DilemmaReport } from '../../domain/entities/dilemma-report.ts';

/** Where the reports of dilemmas are kept. */
export interface DilemmaReportRepository {
  save(report: DilemmaReport): Promise<void>;
  /** The reports of a dilemma, of all its versions, the oldest first. */
  reportsOf(dilemmaId: string): Promise<DilemmaReport[]>;
}
