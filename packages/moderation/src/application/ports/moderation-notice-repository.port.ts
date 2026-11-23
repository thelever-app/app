import type { ModerationNotice } from '../../domain/entities/moderation-notice.ts';

/** Where the moderation notices wait for their player to open the app. */
export interface ModerationNoticeRepository {
  save(notice: ModerationNotice): Promise<void>;
  /** The notices of that identity not seen yet, the oldest first. */
  unseenOf(identity: string): Promise<ModerationNotice[]>;
  findById(id: string): Promise<ModerationNotice | undefined>;
}
