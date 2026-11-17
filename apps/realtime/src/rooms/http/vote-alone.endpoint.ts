import type { VoteAloneUseCase } from '@thelever-app/dilemmas';
import { VoteAloneRequestDto } from '@thelever-app/protocol';
import type { Request, Response } from 'express';
import { identityOf } from '../../http/authentication.ts';
import type { HttpEndpoint } from '../../http/http-endpoint.ts';
import { parseBody } from '../../http/parse-body.ts';

/**
 * POST /dilemmas/:publicId/vote: the caller votes alone the dilemma a link of the public web led
 * to, for its world result: once per version, already-voted the second time.
 */
export class VoteAloneEndpoint implements HttpEndpoint {
  readonly method = 'post';
  readonly path = '/dilemmas/:publicId/vote';
  readonly authenticated = true;
  readonly #voteAlone: VoteAloneUseCase;

  constructor(voteAlone: VoteAloneUseCase) {
    this.#voteAlone = voteAlone;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const { optionId } = parseBody(VoteAloneRequestDto, req.body);
    await this.#voteAlone.execute({
      identity: identityOf(res),
      publicId: String(req.params.publicId),
      optionId,
    });
    res.status(204).end();
  }
}
