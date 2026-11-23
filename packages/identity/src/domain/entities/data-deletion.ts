/**
 * Why the data of an identity are deleted: they asked for it, they withdrew the game consent,
 * which deletes only their game data, or they did not open the app for 24 months.
 */
export const DELETION_REASONS = ['request', 'game-consent-withdrawn', 'inactivity'] as const;

export type DeletionReason = (typeof DELETION_REASONS)[number];

export interface DataDeletionSnapshot {
  readonly id: string;
  readonly identity: string;
  readonly reason: DeletionReason;
  readonly requestedAt: Date;
  /** Null until every store has deleted them. */
  readonly erasedAt: Date | null;
}

/**
 * One deletion in the deletion log: what the deletion job still has to do, and what it does again
 * after a backup is restored, so that nothing deleted comes back. It is kept 3 years.
 */
export class DataDeletion {
  readonly #id: string;
  readonly #identity: string;
  readonly #reason: DeletionReason;
  readonly #requestedAt: Date;
  #erasedAt: Date | null;

  private constructor(snapshot: DataDeletionSnapshot) {
    this.#id = snapshot.id;
    this.#identity = snapshot.identity;
    this.#reason = snapshot.reason;
    this.#requestedAt = snapshot.requestedAt;
    this.#erasedAt = snapshot.erasedAt;
  }

  static request({
    id,
    identity,
    reason,
    now,
  }: {
    readonly id: string;
    readonly identity: string;
    readonly reason: DeletionReason;
    readonly now: Date;
  }): DataDeletion {
    return new DataDeletion({ id, identity, reason, requestedAt: now, erasedAt: null });
  }

  static fromSnapshot(snapshot: DataDeletionSnapshot): DataDeletion {
    return new DataDeletion(snapshot);
  }

  get id(): string {
    return this.#id;
  }

  get identity(): string {
    return this.#identity;
  }

  get reason(): DeletionReason {
    return this.#reason;
  }

  get isPending(): boolean {
    return this.#erasedAt === null;
  }

  /** Every store deleted the data; doing it again, after a restore, keeps the first time. */
  erased(now: Date): void {
    this.#erasedAt ??= now;
  }

  toSnapshot(): DataDeletionSnapshot {
    return {
      id: this.#id,
      identity: this.#identity,
      reason: this.#reason,
      requestedAt: this.#requestedAt,
      erasedAt: this.#erasedAt,
    };
  }
}
