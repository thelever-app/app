import type { DilemmaReportRepository } from '../../application/ports/dilemma-report-repository.port.ts';
import { DilemmaReport, type DilemmaReportSnapshot } from '../../domain/entities/dilemma-report.ts';

/** Keeps the snapshots, so what it gives back is never the object that was saved. */
export class InMemoryDilemmaReportRepository implements DilemmaReportRepository {
  readonly #snapshots = new Map<string, DilemmaReportSnapshot>();

  async save(report: DilemmaReport): Promise<void> {
    this.#snapshots.set(report.id, report.toSnapshot());
  }

  async reportsOf(dilemmaId: string): Promise<DilemmaReport[]> {
    return [...this.#snapshots.values()]
      .filter((snapshot) => snapshot.dilemmaId === dilemmaId)
      .sort((a, b) => a.reportedAt.getTime() - b.reportedAt.getTime())
      .map((snapshot) => DilemmaReport.fromSnapshot(snapshot));
  }
}
