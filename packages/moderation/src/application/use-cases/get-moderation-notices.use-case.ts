import type { ModerationNoticeSnapshot } from '../../domain/entities/moderation-notice.ts';
import type { ModerationNoticeRepository } from '../ports/moderation-notice-repository.port.ts';

/** The moderation notices the app shows a player when it opens, the oldest first. */
export class GetModerationNoticesUseCase {
  readonly #notices: ModerationNoticeRepository;

  constructor(notices: ModerationNoticeRepository) {
    this.#notices = notices;
  }

  async execute(identity: string): Promise<ModerationNoticeSnapshot[]> {
    return (await this.#notices.unseenOf(identity)).map((notice) => notice.toSnapshot());
  }
}
