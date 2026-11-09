import type { JoinRoomUseCase } from '@thelever-app/game';
import { JoinRoomRequestDto, JoinRoomResponseDto } from '@thelever-app/protocol';
import type { Request, Response } from 'express';
import { identityOf } from '../../http/authentication.ts';
import type { HttpEndpoint } from '../../http/http-endpoint.ts';
import type { RunCommand } from '../run-command.ts';
import { parseBody } from '../../http/parse-body.ts';

/** POST /rooms/:roomId/players: whoever calls joins the room, or gets back the player they had. */
export class JoinRoomEndpoint implements HttpEndpoint {
  readonly method = 'post';
  readonly path = '/rooms/:roomId/players';
  readonly authenticated = true;
  readonly #joinRoom: JoinRoomUseCase;
  readonly #runCommand: RunCommand;

  constructor(joinRoom: JoinRoomUseCase, runCommand: RunCommand) {
    this.#joinRoom = joinRoom;
    this.#runCommand = runCommand;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const { nickname, avatar } = parseBody(JoinRoomRequestDto, req.body);
    const { playerId } = await this.#runCommand(() =>
      this.#joinRoom.execute({
        roomId: String(req.params.roomId),
        nickname,
        identity: identityOf(res),
        avatar,
      }),
    );
    res.status(201).json(JoinRoomResponseDto.parse({ playerId }));
  }
}
