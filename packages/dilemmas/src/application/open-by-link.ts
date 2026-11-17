import type { Dilemma } from '../domain/entities/dilemma.ts';
import { DilemmaNotFoundError } from './errors/dilemma-not-found.error.ts';
import type { DilemmaRepository } from './ports/dilemma-repository.port.ts';

/**
 * The dilemma a link of the public web leads to, by its public id: one a new room may start with
 * and anyone may vote alone, as the web shows them: public, in the general catalog, suitable from
 * 16 and not compromising. Any other is not found, as one that does not exist, so nobody reaches a
 * dilemma by guessing ids: DilemmaNotFoundError.
 */
export async function openByLink(
  dilemmaRepository: DilemmaRepository,
  publicId: string,
): Promise<Dilemma> {
  const dilemma = await dilemmaRepository.findByPublicId(publicId);
  const open =
    dilemma?.visibility === 'public' &&
    dilemma.status === 'in-catalog' &&
    dilemma.isSuitableForMinors() &&
    !dilemma.compromising;
  if (!open) throw new DilemmaNotFoundError(publicId);
  return dilemma;
}
