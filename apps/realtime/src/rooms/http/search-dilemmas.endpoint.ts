import type { SearchDilemmasUseCase } from '@thelever-app/game';
import { SearchDilemmasQueryDto, SearchDilemmasResponseDto } from '@thelever-app/protocol';
import type { Request, Response } from 'express';
import { identityOf } from '../../http/authentication.ts';
import type { HttpEndpoint } from '../../http/http-endpoint.ts';
import { parseBody } from '../../http/parse-body.ts';

/**
 * GET /rooms/:roomId/dilemmas: the dilemmas of the catalog that suit the room, for a player of the
 * room to pick or add one, the best matches of what they typed first. Only whoever asks sees the answer, so it is not a message of the room.
 */
export class SearchDilemmasEndpoint implements HttpEndpoint {
  readonly method = 'get';
  readonly path = '/rooms/:roomId/dilemmas';
  readonly authenticated = true;
  readonly #searchDilemmas: SearchDilemmasUseCase;

  constructor(searchDilemmas: SearchDilemmasUseCase) {
    this.#searchDilemmas = searchDilemmas;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const { category, q } = parseBody(SearchDilemmasQueryDto, req.query);
    const dilemmas = await this.#searchDilemmas.execute({
      roomId: String(req.params.roomId),
      identity: identityOf(res),
      ...(category && { category }),
      ...(q && { text: q }),
    });
    res.status(200).json(SearchDilemmasResponseDto.parse({ dilemmas }));
  }
}
