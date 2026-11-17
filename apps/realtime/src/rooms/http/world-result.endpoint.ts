import type { GetWorldResultUseCase } from '@thelever-app/dilemmas';
import { WorldResultQueryDto, WorldResultResponseDto } from '@thelever-app/protocol';
import type { Request, Response } from 'express';
import type { HttpEndpoint } from '../../http/http-endpoint.ts';
import { parseBody } from '../../http/parse-body.ts';

/**
 * GET /dilemmas/:publicId/world-result: how the world voted the dilemma, as published once a day,
 * for the option the device voted and its prediction, which it sends and nobody keeps.
 */
export class WorldResultEndpoint implements HttpEndpoint {
  readonly method = 'get';
  readonly path = '/dilemmas/:publicId/world-result';
  readonly authenticated = true;
  readonly #getWorldResult: GetWorldResultUseCase;

  constructor(getWorldResult: GetWorldResultUseCase) {
    this.#getWorldResult = getWorldResult;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const { option, prediction } = parseBody(WorldResultQueryDto, req.query);
    const result = await this.#getWorldResult.execute({
      publicId: String(req.params.publicId),
      optionId: option,
      prediction,
    });
    res.status(200).json(WorldResultResponseDto.parse(result));
  }
}
