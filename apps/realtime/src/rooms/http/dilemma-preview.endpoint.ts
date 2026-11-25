import type { GetDilemmaPreviewUseCase } from '@thelever-app/dilemmas';
import type { SealProvider } from '@thelever-app/game';
import { DilemmaPreviewQueryDto, DilemmaPreviewResponseDto } from '@thelever-app/protocol';
import type { Request, Response } from 'express';
import { identityOf } from '../../http/authentication.ts';
import type { HttpEndpoint } from '../../http/http-endpoint.ts';
import { parseBody } from '../../http/parse-body.ts';

/**
 * GET /dilemmas/:publicId: what the screen to play a dilemma with the group shows of it, from the
 * public id its link carries. Only callers with a token, as the preview of a room. To start a room,
 * the seal of whoever asks tells whether they are under 18, who never see a dilemma for adults.
 */
export class DilemmaPreviewEndpoint implements HttpEndpoint {
  readonly method = 'get';
  readonly path = '/dilemmas/:publicId';
  readonly authenticated = true;
  readonly #getDilemmaPreview: GetDilemmaPreviewUseCase;
  readonly #sealProvider: SealProvider;

  constructor(getDilemmaPreview: GetDilemmaPreviewUseCase, sealProvider: SealProvider) {
    this.#getDilemmaPreview = getDilemmaPreview;
    this.#sealProvider = sealProvider;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const publicId = String(req.params.publicId);
    const toStartARoom = parseBody(DilemmaPreviewQueryDto, req.query).for === 'room';
    const preview = await this.#getDilemmaPreview.execute(
      toStartARoom
        ? {
            publicId,
            toStartARoom,
            underEighteen: (await this.#sealProvider.sealFor(identityOf(res))).underEighteen,
          }
        : { publicId },
    );
    res.status(200).json(DilemmaPreviewResponseDto.parse(preview));
  }
}
