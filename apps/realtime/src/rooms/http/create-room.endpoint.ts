import type { CreateRoomUseCase } from '@thelever-app/game';
import { CreateRoomRequestDto, CreateRoomResponseDto } from '@thelever-app/protocol';
import type { Request, Response } from 'express';
import { identityOf } from '../../http/authentication.ts';
import type { HttpEndpoint } from '../../http/http-endpoint.ts';
import type { RunCommand } from '../run-command.ts';
import { parseBody } from '../../http/parse-body.ts';

/** POST /rooms: whoever calls creates a room and becomes its host, starting with a dilemma if given one. */
export class CreateRoomEndpoint implements HttpEndpoint {
  readonly method = 'post';
  readonly path = '/rooms';
  readonly authenticated = true;
  /** A host creates a room now and then; each one takes a code and rows of the database. */
  readonly perIdentityPerMinute = 5;
  readonly #createRoom: CreateRoomUseCase;
  readonly #runCommand: RunCommand;

  constructor(createRoom: CreateRoomUseCase, runCommand: RunCommand) {
    this.#createRoom = createRoom;
    this.#runCommand = runCommand;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const {
      nickname,
      ambience,
      avatar,
      dilemmaLanguage,
      firstRoundDilemmaId,
      playedDilemmaIds = [],
    } = parseBody(CreateRoomRequestDto, req.body);
    const { roomId, code, hostId } = await this.#runCommand(() =>
      this.#createRoom.execute({
        ambience,
        hostNickname: nickname,
        hostIdentity: identityOf(res),
        hostAvatar: avatar,
        dilemmaLanguage,
        ...(firstRoundDilemmaId && { firstRoundDilemmaId }),
        hostPlayedDilemmaIds: playedDilemmaIds,
      }),
    );
    res.status(201).json(CreateRoomResponseDto.parse({ roomId, code, playerId: hostId }));
  }
}
