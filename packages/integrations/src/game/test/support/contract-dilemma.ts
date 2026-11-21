import { Dilemma, type DilemmaRepository, type IdGenerator } from '@thelever-app/dilemmas';
import type { CONTRACT_DILEMMAS } from '@thelever-app/game/contracts';

/** A dilemma of the curation team as the catalog contract of Game describes it, with its status. */
export function contractDilemma(
  {
    text,
    options,
    category,
    tags,
    minimumAge,
    compromising,
    type,
    scale,
    fixedOrder,
    status,
  }: (typeof CONTRACT_DILEMMAS)[number],
  idGenerator: IdGenerator,
): Dilemma {
  const created = Dilemma.create(
    {
      text,
      options,
      category,
      tags,
      minimumAge,
      type,
      compromising,
      scale,
      fixedOrder,
      language: 'es',
    },
    idGenerator,
  );
  const snapshot = created.toSnapshot();
  return Dilemma.restore({ ...snapshot, version: { ...snapshot.version, status } });
}

/**
 * Saves the dilemmas of the catalog contract of Game with their translations, and returns the
 * originals and what the contract expects of each one as stored.
 */
export async function saveContractDilemmas(
  contracts: typeof CONTRACT_DILEMMAS,
  repository: DilemmaRepository,
  idGenerator: IdGenerator,
) {
  const dilemmas: Dilemma[] = [];
  for (const contract of contracts) {
    const original = contractDilemma(contract, idGenerator);
    await repository.save(original);
    for (const { language, text, options } of contract.translations) {
      await repository.save(
        Dilemma.translate(original, { language, text, options, tags: [] }, idGenerator),
      );
    }
    dilemmas.push(original);
  }
  const stored = dilemmas.map((dilemma) => ({
    dilemmaId: dilemma.id,
    text: dilemma.text,
    options: dilemma.options.map(({ id, text }) => ({ optionId: id, text })),
    category: dilemma.category,
    language: dilemma.language,
  }));
  return { dilemmas, stored };
}
