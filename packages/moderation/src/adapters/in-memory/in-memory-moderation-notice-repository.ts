import type { ModerationNoticeRepository } from '../../application/ports/moderation-notice-repository.port.ts';
import {
  ModerationNotice,
  type ModerationNoticeSnapshot,
} from '../../domain/entities/moderation-notice.ts';

export class InMemoryModerationNoticeRepository implements ModerationNoticeRepository {
  readonly #snapshots = new Map<string, ModerationNoticeSnapshot>();

  async save(notice: ModerationNotice): Promise<void> {
    this.#snapshots.set(notice.id, notice.toSnapshot());
  }

  async unseenOf(identity: string): Promise<ModerationNotice[]> {
    return [...this.#snapshots.values()]
      .filter((notice) => notice.identity === identity && notice.seenAt === null)
      .sort((a, b) => a.decidedAt.getTime() - b.decidedAt.getTime() || a.id.localeCompare(b.id))
      .map((snapshot) => ModerationNotice.fromSnapshot(snapshot));
  }

  async allOf(identity: string): Promise<ModerationNotice[]> {
    return [...this.#snapshots.values()]
      .filter((notice) => notice.identity === identity)
      .sort((a, b) => a.decidedAt.getTime() - b.decidedAt.getTime() || a.id.localeCompare(b.id))
      .map((snapshot) => ModerationNotice.fromSnapshot(snapshot));
  }

  async deleteAllOf(identity: string): Promise<void> {
    for (const [id, notice] of this.#snapshots) {
      if (notice.identity === identity) this.#snapshots.delete(id);
    }
  }

  async findById(id: string): Promise<ModerationNotice | undefined> {
    const snapshot = this.#snapshots.get(id);
    return snapshot && ModerationNotice.fromSnapshot(snapshot);
  }
}
