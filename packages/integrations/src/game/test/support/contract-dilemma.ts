import { Dilemma, type IdGenerator } from '@thelever-app/dilemmas';
import type { CONTRACT_DILEMMAS } from '@thelever-app/game/contracts';

/** A dilemma of the curation team as the catalog contract of Game describes it, with its status. */
export function contractDilemma(
  { text, options, category, tags, minimumAge, status }: (typeof CONTRACT_DILEMMAS)[number],
  idGenerator: IdGenerator,
): Dilemma {
  const created = Dilemma.create(
    { text, options, category, tags, minimumAge, language: 'es' },
    idGenerator,
  );
  const snapshot = created.toSnapshot();
  return Dilemma.restore({ ...snapshot, version: { ...snapshot.version, status } });
}
