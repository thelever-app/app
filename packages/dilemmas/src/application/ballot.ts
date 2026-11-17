import type { Dilemma } from '../domain/entities/dilemma.ts';
import { UnknownOptionError } from '../domain/errors/unknown-option.error.ts';
import type { Ballot } from './ports/world-result-repository.port.ts';

/**
 * How the world result counts a vote for that option of the dilemma: for the version of the
 * original it is or translates, by the position of the option, which is the same in every
 * translation of that version.
 */
export function ballotOf(dilemma: Dilemma, optionId: string): Ballot {
  const position = dilemma.options.findIndex(({ id }) => id === optionId);
  if (position === -1) throw new UnknownOptionError(optionId);
  const of = dilemma.translationOf;
  return of
    ? { dilemmaId: of.dilemmaId, version: of.version, position }
    : { dilemmaId: dilemma.id, version: dilemma.version, position };
}
