import type { Logger } from '@thelever-app/db';
import type { DeletionsToEraseUseCase, ErasePersonalDataUseCase } from '@thelever-app/identity';
import type { RunCommand } from '../../rooms/run-command.ts';

/** What the deletion job needs. */
export interface Erasure {
  readonly deletionsToErase: DeletionsToEraseUseCase;
  readonly erasePersonalData: ErasePersonalDataUseCase;
  readonly runCommand: RunCommand;
  readonly logger: Logger;
}

/**
 * Deletes what each deletion of the log asks for, each in a transaction of its own, the oldest
 * first; or, after a backup is restored, every deletion of the log again. One that fails stays
 * pending and the others go on; the job fails at the end, so its alert fires and the next run
 * tries it again. The logs never name the identity.
 */
export async function erasePersonalData(
  { deletionsToErase, erasePersonalData: erase, runCommand, logger }: Erasure,
  { again }: { readonly again: boolean },
): Promise<{ readonly erased: number; readonly failed: number }> {
  let erased = 0;
  let failed = 0;
  for (const deletionId of await deletionsToErase.execute({ again })) {
    try {
      await runCommand(() => erase.execute(deletionId));
      erased += 1;
    } catch (error) {
      failed += 1;
      logger.error('erasing the data of a deletion failed', error, { deletionId });
    }
  }
  logger.info('personal data erased', { erased, failed, again });
  if (failed > 0) throw new Error(`${failed} deletions could not be erased`);
  return { erased, failed };
}
