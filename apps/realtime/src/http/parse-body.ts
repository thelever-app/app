/** Any schema of the contract: it either reads the body or rejects it. */
interface BodySchema<T> {
  safeParse(body: unknown): { success: true; data: T } | { success: false };
}

/** The body does not follow the contract of the endpoint. */
export class InvalidBodyError extends Error {
  constructor() {
    super('the body does not follow the contract');
    this.name = 'InvalidBodyError';
  }
}

/** The body read with the schema of the endpoint; throws InvalidBodyError if it does not follow it. */
export function parseBody<T>(schema: BodySchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new InvalidBodyError();
  return result.data;
}
