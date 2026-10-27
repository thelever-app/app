import { ServerMessageDto, type ConnectDto } from '@thelever-app/protocol';
import type { WebSocket } from 'ws';

/** What a connection knows once its player has connected. The player and the game never come from a message. */
export interface Session {
  readonly gameId: string;
  readonly playerId: string;
  readonly connectionId: string;
  readonly language: ConnectDto['language'];
}

/** One socket of the room server and the session of its player, once connected. */
export class RoomConnection {
  readonly socket: WebSocket;
  session: Session | undefined;

  constructor(socket: WebSocket) {
    this.socket = socket;
  }

  /** Every message is checked against the contract before it leaves. */
  send(message: unknown): void {
    this.socket.send(JSON.stringify(ServerMessageDto.parse(message)));
  }
}
