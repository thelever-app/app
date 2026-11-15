/** Some dilemmas of the curated catalog could not be loaded; the rest were. */
export class CatalogImportFailedError extends Error {
  readonly failures: readonly { readonly number: number; readonly reason: string }[];

  constructor(failures: readonly { readonly number: number; readonly reason: string }[]) {
    super(
      `${failures.length} dilemmas of the curated catalog could not be loaded: ${failures
        .map(({ number, reason }) => `DLM-${number} (${reason})`)
        .join('; ')}`,
    );
    this.name = 'CatalogImportFailedError';
    this.failures = failures;
  }
}
