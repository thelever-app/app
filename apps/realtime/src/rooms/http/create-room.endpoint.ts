import type { CreateRoomUseCase } from '@thelever-app/game';
import { CreateRoomRequestDto, CreateRoomResponseDto } from '@thelever-app/protocol';
import type { Request, Response } from 'express';
import { identityOf } from '../../http/authentication.ts';
import type { HttpEndpoint } from '../../http/http-endpoint.ts';
import { parseBody } from '../../http/parse-body.ts';

/** POST /rooms: whoever calls creates a room and becomes its host. */
export class CreateRoomEndpoint implements HttpEndpoint {
  readonly method = 'post';
  readonly path = '/rooms';
  readonly authenticated = true;
  readonly #createRoom: CreateRoomUseCase;

  constructor(createRoom: CreateRoomUseCase) {
    this.#createRoom = createRoom;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const { nickname } = parseBody(CreateRoomRequestDto, req.body);
    const { roomId, hostId } = await this.#createRoom.execute({
      hostNickname: nickname,
      hostIdentity: identityOf(res),
    });
    res.status(201).json(CreateRoomResponseDto.parse({ roomId, playerId: hostId }));
  }
}
