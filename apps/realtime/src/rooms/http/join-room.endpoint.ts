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
  /** Joining is retried when a nickname is taken; far more is a script. */
  readonly perIdentityPerMinute = 20;
  readonly #joinRoom: JoinRoomUseCase;
  readonly #roomLock: KeyedLock;
  readonly #runCommand: RunCommand;

  constructor(joinRoom: JoinRoomUseCase, roomLock: KeyedLock, runCommand: RunCommand) {
    this.#joinRoom = joinRoom;
    this.#roomLock = roomLock;
    this.#runCommand = runCommand;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const {
      nickname,
      avatar,
      playedDilemmaIds = [],
      leavingRoomId,
    } = parseBody(JoinRoomRequestDto, req.body);
    const roomId = String(req.params.roomId);
    // Both rooms, always in the same order, so two hosts who swap rooms never wait for each other.
    const keys = [...new Set([roomId, leavingRoomId ?? roomId])].sort();
    const releases = [];
    let joined: JoinRoomOutput;
    try {
      for (const key of keys) releases.push(await this.#roomLock.acquire(key));
      joined = await this.#runCommand(() =>
        this.#joinRoom.execute({
          roomId,
          nickname,
          identity: identityOf(res),
          avatar,
          playedDilemmaIds,
          ...(leavingRoomId && { leavingRoomId }),
        }),
      );
    } finally {
      for (const release of releases) release();
    }
    res.status(201).json(JoinRoomResponseDto.parse(joined));
  }
}
