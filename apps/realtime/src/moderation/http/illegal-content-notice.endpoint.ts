import type { ReceiveIllegalContentNoticeUseCase } from '@thelever-app/moderation';
import { IllegalContentNoticeRequestDto } from '@thelever-app/protocol';
import type { Request, Response } from 'express';
import { identityOf } from '../../http/authentication.ts';
import type { HttpEndpoint } from '../../http/http-endpoint.ts';
import { parseBody } from '../../http/parse-body.ts';
import type { RunCommand } from '../../rooms/run-command.ts';

/**
 * POST /illegal-content-notices: anyone sends a notice of illegal content from the web form,
 * without the app and without its first access. The app signs them in without asking anything,
 * and App Check and the limit of notices a day keep the form from flooding the team.
 */
export class IllegalContentNoticeEndpoint implements HttpEndpoint {
  readonly method = 'post';
  readonly path = '/illegal-content-notices';
  readonly authenticated = true;
  /** Above the 5 of the day, so that one answers first; it still counts one by one notices sent together, which the limit of the day reads in parallel. */
  readonly perIdentityPerMinute = 6;
  readonly #receive: ReceiveIllegalContentNoticeUseCase;
  readonly #runCommand: RunCommand;

  constructor(receive: ReceiveIllegalContentNoticeUseCase, runCommand: RunCommand) {
    this.#receive = receive;
    this.#runCommand = runCommand;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const { reference, explanation, name, email, language, goodFaith } = parseBody(
      IllegalContentNoticeRequestDto,
      req.body,
    );
    await this.#runCommand(() =>
      this.#receive.execute({
        reference,
        explanation,
        name: name ?? null,
        email: email ?? null,
        language,
        goodFaith,
        identity: identityOf(res),
      }),
    );
    res.status(204).end();
  }
}
