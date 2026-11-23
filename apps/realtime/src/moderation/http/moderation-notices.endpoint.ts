import type {
  GetModerationNoticesUseCase,
  ModerationNoticeSnapshot,
  SeeModerationNoticeUseCase,
} from '@thelever-app/moderation';
import { type ModerationNoticeDto, ModerationNoticesResponseDto } from '@thelever-app/protocol';
import type { Request, Response } from 'express';
import { identityOf } from '../../http/authentication.ts';
import type { HttpEndpoint } from '../../http/http-endpoint.ts';
import type { RunCommand } from '../../rooms/run-command.ts';

function noticeDtoOf({
  id,
  subject,
  outcome,
  rule,
  decidedAt,
}: ModerationNoticeSnapshot): ModerationNoticeDto {
  return {
    id,
    subject:
      subject.kind === 'report'
        ? { ...subject, reportedAt: subject.reportedAt.toISOString() }
        : { ...subject, facts: { ...subject.facts } },
    outcome,
    rule,
    decidedAt: decidedAt.toISOString(),
  };
}

/** GET /moderation-notices: the decisions the caller has not seen yet, only theirs. */
export class ModerationNoticesEndpoint implements HttpEndpoint {
  readonly method = 'get';
  readonly path = '/moderation-notices';
  readonly authenticated = true;
  readonly #getNotices: GetModerationNoticesUseCase;

  constructor(getNotices: GetModerationNoticesUseCase) {
    this.#getNotices = getNotices;
  }

  async handle(_req: Request, res: Response): Promise<void> {
    const notices = await this.#getNotices.execute(identityOf(res));
    res.json(ModerationNoticesResponseDto.parse({ notices: notices.map(noticeDtoOf) }));
  }
}

/** POST /moderation-notices/:noticeId/seen: the caller saw it, and the app does not show it again. */
export class SeeModerationNoticeEndpoint implements HttpEndpoint {
  readonly method = 'post';
  readonly path = '/moderation-notices/:noticeId/seen';
  readonly authenticated = true;
  readonly #seeNotice: SeeModerationNoticeUseCase;
  readonly #runCommand: RunCommand;

  constructor(seeNotice: SeeModerationNoticeUseCase, runCommand: RunCommand) {
    this.#seeNotice = seeNotice;
    this.#runCommand = runCommand;
  }

  async handle(req: Request, res: Response): Promise<void> {
    await this.#runCommand(() =>
      this.#seeNotice.execute({
        identity: identityOf(res),
        noticeId: String(req.params.noticeId),
      }),
    );
    res.status(204).end();
  }
}
