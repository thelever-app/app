/** A report or a notice with a field Moderation cannot take: an unknown reason, language or email. */
export class InvalidEntryError extends Error {
  constructor(field: string, value: unknown) {
    super(`${String(value)} is not a valid ${field}`);
    this.name = 'InvalidEntryError';
  }
}
