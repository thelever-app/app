import { UnknownCategoryError } from '../errors/unknown-category.error.ts';

/**
 * The closed list of categories. Each id is stored with every version and reaches the dataset,
 * so it is never renamed or removed while a dilemma uses it; the screen translates it.
 */
export const CATEGORIES = [
  'life-and-death',
  'honesty',
  'loyalty',
  'justice',
  'love-and-relationships',
  'work-and-money',
  'technology-and-the-future',
] as const;

export type Category = (typeof CATEGORIES)[number];

export class CategoryVO {
  readonly value: Category;

  constructor(value: string) {
    const category = CATEGORIES.find((candidate) => candidate === value);
    if (!category) {
      throw new UnknownCategoryError(value);
    }
    this.value = category;
  }
}
