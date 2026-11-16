import type { GetDilemmaPreviewUseCase } from '@thelever-app/dilemmas';
import { DilemmaPreviewResponseDto } from '@thelever-app/protocol';
import type { Request, Response } from 'express';
import type { HttpEndpoint } from '../../http/http-endpoint.ts';

/**
 * GET /dilemmas/:publicId: what the screen to play a dilemma with the group shows of it, from the
 * public id its link carries. Only callers with a token, as the preview of a room.
 */
export class DilemmaPreviewEndpoint implements HttpEndpoint {
  readonly method = 'get';
  readonly path = '/dilemmas/:publicId';
  readonly authenticated = true;
  readonly #getDilemmaPreview: GetDilemmaPreviewUseCase;

  constructor(getDilemmaPreview: GetDilemmaPreviewUseCase) {
    this.#getDilemmaPreview = getDilemmaPreview;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const preview = await this.#getDilemmaPreview.execute({
      publicId: String(req.params.publicId),
    });
    res.status(200).json(DilemmaPreviewResponseDto.parse(preview));
  }
}
