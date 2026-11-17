import { UnknownDilemmaTypeError } from '../errors/unknown-dilemma-type.error.ts';

/**
 * The closed list of dilemma types: a standard situation, one where what suits a player depends on
 * what the others choose, and a «¿Qué prefieres…?» with two options. Each id is stored with every
 * version and reaches the dataset, so it is never renamed or removed while a dilemma uses it.
 */
export const DILEMMA_TYPES = ['standard', 'game-theory', 'would-you-rather'] as const;

export type DilemmaType = (typeof DILEMMA_TYPES)[number];

export class DilemmaTypeVO {
  readonly value: DilemmaType;

  constructor(value: string) {
    const type = DILEMMA_TYPES.find((candidate) => candidate === value);
    if (!type) {
      throw new UnknownDilemmaTypeError(value);
    }
    this.value = type;
  }
}
