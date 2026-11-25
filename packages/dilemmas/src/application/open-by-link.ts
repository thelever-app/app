import type { Dilemma } from '../domain/entities/dilemma.ts';
import { DilemmaNotFoundError } from './errors/dilemma-not-found.error.ts';
import { DilemmaOnlyForAdultsError } from './errors/dilemma-only-for-adults.error.ts';
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

/**
 * The dilemma a link leads to for a new room to start with, by its public id, as the QR of a
 * flyer opens it: public, in the general catalog and not compromising, also one for adults. Any
 * other is not found, as one that does not exist. Someone under 18 never gets one for adults:
 * DilemmaOnlyForAdultsError.
 */
export async function openToStartARoom(
  dilemmaRepository: DilemmaRepository,
  publicId: string,
  underEighteen: boolean,
): Promise<Dilemma> {
  const dilemma = await dilemmaRepository.findByPublicId(publicId);
  const open =
    dilemma?.visibility === 'public' && dilemma.status === 'in-catalog' && !dilemma.compromising;
  if (!open) throw new DilemmaNotFoundError(publicId);
  if (underEighteen && !dilemma.isSuitableForMinors()) {
    throw new DilemmaOnlyForAdultsError(publicId);
  }
  return dilemma;
}
