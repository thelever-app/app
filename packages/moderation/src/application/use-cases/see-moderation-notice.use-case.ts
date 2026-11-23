import type { Clock } from '../../domain/ports/clock.port.ts';
import type { ModerationNoticeRepository } from '../ports/moderation-notice-repository.port.ts';
import { ModerationNoticeNotFoundError } from '../errors/moderation-notice-not-found.error.ts';

/** The player saw the moderation notice: the app does not show it again. Only theirs. */
export class SeeModerationNoticeUseCase {
  readonly #notices: ModerationNoticeRepository;
  readonly #clock: Clock;

  constructor(notices: ModerationNoticeRepository, clock: Clock) {
    this.#notices = notices;
    this.#clock = clock;
  }

  async execute({ identity, noticeId }: { identity: string; noticeId: string }): Promise<void> {
    const notice = await this.#notices.findById(noticeId);
    if (!notice || notice.identity !== identity) throw new ModerationNoticeNotFoundError(noticeId);
    notice.seen(this.#clock.now());
    await this.#notices.save(notice);
  }
}
