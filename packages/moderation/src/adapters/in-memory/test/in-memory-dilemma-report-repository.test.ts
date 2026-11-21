import { describeDilemmaReportRepositoryContract } from '../../test/dilemma-report-repository.contract.ts';
import { InMemoryDilemmaReportRepository } from '../in-memory-dilemma-report-repository.ts';

describeDilemmaReportRepositoryContract('InMemoryDilemmaReportRepository', async () => ({
  repository: new InMemoryDilemmaReportRepository(),
  dilemmas: [
    { dilemmaId: 'TestDilemma1', version: 1 },
    { dilemmaId: 'TestDilemma2', version: 3 },
  ],
}));
