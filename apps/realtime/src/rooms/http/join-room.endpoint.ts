import type { JoinRoomOutput, JoinRoomUseCase } from '@thelever-app/game';
import { JoinRoomRequestDto, JoinRoomResponseDto } from '@thelever-app/protocol';
import type { Request, Response } from 'express';
import type { KeyedLock } from '../../concurrency/keyed-lock.ts';
import { identityOf } from '../../http/authentication.ts';
import type { HttpEndpoint } from '../../http/http-endpoint.ts';
import type { RunCommand } from '../run-command.ts';
import { parseBody } from '../../http/parse-body.ts';

/**
 * POST /rooms/:roomId/players: whoever calls joins the room, or gets back the player they had. It
 * holds the room like the commands of its sockets do, since joining may change its game.
 */
export class JoinRoomEndpoint implements HttpEndpoint {
  readonly method = 'post';
  readonly path = '/rooms/:roomId/players';
  readonly authenticated = true;
  readonly #joinRoom: JoinRoomUseCase;
  readonly #roomLock: KeyedLock;
  readonly #runCommand: RunCommand;

  constructor(joinRoom: JoinRoomUseCase, roomLock: KeyedLock, runCommand: RunCommand) {
    this.#joinRoom = joinRoom;
    this.#roomLock = roomLock;
    this.#runCommand = runCommand;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const { nickname, avatar } = parseBody(JoinRoomRequestDto, req.body);
    const roomId = String(req.params.roomId);
    const release = await this.#roomLock.acquire(roomId);
    let joined: JoinRoomOutput;
    try {
      joined = await this.#runCommand(() =>
        this.#joinRoom.execute({ roomId, nickname, identity: identityOf(res), avatar }),
      );
    } finally {
      release();
    }
    res.status(201).json(JoinRoomResponseDto.parse(joined));
  }
}
