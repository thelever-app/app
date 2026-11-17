import { UnknownScaleError } from '../errors/unknown-scale.error.ts';

/**
 * How much is at stake in a dilemma, from an everyday matter to life and death. Each id is stored
 * with every version and reaches the dataset, so it is never renamed or removed while a dilemma uses it.
 */
export const SCALES = ['everyday', 'medium', 'extreme'] as const;

export type Scale = (typeof SCALES)[number];

export class ScaleVO {
  readonly value: Scale;

  constructor(value: string) {
    const scale = SCALES.find((candidate) => candidate === value);
    if (!scale) {
      throw new UnknownScaleError(value);
    }
    this.value = scale;
  }
}
