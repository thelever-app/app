/** Whether an identity objects to product analytics: then nothing of it is recorded. */
export interface Objections {
  objects(identity: string): Promise<boolean>;
}
