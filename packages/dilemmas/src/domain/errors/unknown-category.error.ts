export class UnknownCategoryError extends Error {
  constructor(category: string) {
    super(`"${category}" is not a category`);
    this.name = 'UnknownCategoryError';
  }
}
