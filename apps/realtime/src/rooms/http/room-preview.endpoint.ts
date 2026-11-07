import type { GetRoomPreviewUseCase } from '@thelever-app/game';
import { RoomPreviewResponseDto } from '@thelever-app/protocol';
import type { Request, Response } from 'express';
import type { HttpEndpoint } from '../../http/http-endpoint.ts';

/**
 * GET /rooms/by-code/:code: what a player sees of a room before entering it, from its code, which
 * the invitation link and the QR carry. Only callers with a token: the codes cannot be swept
 * from outside the app.
 */
export class RoomPreviewEndpoint implements HttpEndpoint {
  readonly method = 'get';
  readonly path = '/rooms/by-code/:code';
  readonly authenticated = true;
  readonly #getRoomPreview: GetRoomPreviewUseCase;

  constructor(getRoomPreview: GetRoomPreviewUseCase) {
    this.#getRoomPreview = getRoomPreview;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const preview = await this.#getRoomPreview.execute({ code: String(req.params.code) });
    res.status(200).json(RoomPreviewResponseDto.parse(preview));
  }
}
