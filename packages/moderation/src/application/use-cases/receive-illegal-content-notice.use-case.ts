import { IllegalContentNotice } from '../../domain/entities/illegal-content-notice.ts';
import type { Clock } from '../../domain/ports/clock.port.ts';
import { InvalidEntryError } from '../../domain/errors/invalid-entry.error.ts';
import { isLanguage } from '../../domain/vos/language.vo.ts';
import { TooManyNoticesError } from '../errors/too-many-notices.error.ts';
import type { ModeratedNicknames } from '../ports/moderated-nicknames.port.ts';
import type { IssueContent } from '../../domain/vos/issue-content.vo.ts';
import { type ReceivePorts, receiveEntry } from './receive-entry.ts';

/** How many notices one identity may send a day: enough for anyone, too few to flood the team. */
export const MAXIMUM_NOTICES_PER_DAY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReceiveIllegalContentNoticeInput {
  readonly reference: string;
  readonly explanation: string;
  readonly name: string | null;
  readonly email: string | null;
  readonly language: string;
  readonly goodFaith: boolean;
  readonly identity: string;
}

/**
 * Anyone sends a notice of illegal content from the web form: on the issue of the dilemma its
 * link or number points to, on that of the nickname its room and nickname point to, or on an
 * issue of its own. Whoever left an email gets the acknowledgement there.
 */
export class ReceiveIllegalContentNoticeUseCase {
  readonly #ports: ReceivePorts;
  readonly #nicknames: ModeratedNicknames;
  readonly #clock: Clock;

  constructor(
    ports: ReceivePorts & { readonly nicknames: ModeratedNicknames; readonly clock: Clock },
  ) {
    this.#ports = ports;
    this.#nicknames = ports.nicknames;
    this.#clock = ports.clock;
  }

  async execute({ language, ...input }: ReceiveIllegalContentNoticeInput): Promise<void> {
    if (!isLanguage(language)) throw new InvalidEntryError('language', language);
    const sentAt = this.#clock.now();
    const sent = await this.#ports.issues.noticesSentSince(
      input.identity,
      new Date(sentAt.getTime() - DAY_MS),
    );
    if (sent >= MAXIMUM_NOTICES_PER_DAY) throw new TooManyNoticesError(MAXIMUM_NOTICES_PER_DAY);
    const notice = IllegalContentNotice.receive({
      id: this.#ports.idGenerator.generate(),
      ...input,
      language,
      sentAt,
    });
    await receiveEntry(
      this.#ports,
      await this.#contentOf(notice.toSnapshot().reference),
      notice,
      sentAt,
    );
  }

  async #contentOf(reference: string): Promise<IssueContent> {
    const dilemmaId = await this.#ports.dilemmas.dilemmaOf(reference);
    if (dilemmaId !== null) return { kind: 'dilemma', dilemmaId };
    const nickname = await this.#nicknames.nicknameOf(reference);
    if (nickname !== null) return { kind: 'nickname', ...nickname };
    return { kind: 'reference', reference };
  }
}
