import type { StartDecisionPhaseUseCase } from '@thelever-app/game';
import { StartGameRequestDto, StartGameResponseDto } from '@thelever-app/protocol';
import type { Request, Response } from 'express';
import type { HttpEndpoint } from '../../http/http-endpoint.ts';
import { parseBody } from '../../http/parse-body.ts';

/** POST /rooms/:roomId/games: starts a game in the decision phase with the dilemmas asked for. */
export class StartGameEndpoint implements HttpEndpoint {
  readonly method = 'post';
  readonly path = '/rooms/:roomId/games';
  readonly authenticated = true;
  readonly #startDecisionPhase: StartDecisionPhaseUseCase;

  constructor(startDecisionPhase: StartDecisionPhaseUseCase) {
    this.#startDecisionPhase = startDecisionPhase;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const { dilemmaIds } = parseBody(StartGameRequestDto, req.body);
    const { gameId } = await this.#startDecisionPhase.execute({
      roomId: String(req.params.roomId),
      dilemmaIds,
    });
    res.status(201).json(StartGameResponseDto.parse({ gameId }));
  }
}
