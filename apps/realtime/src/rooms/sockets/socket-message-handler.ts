import type { ClientMessageDto } from '@thelever-app/protocol';
import type { RoomConnection } from './room-connection.ts';

/** Handles one type of client message. The socket server dispatches each message to the handler of its type. */
export interface SocketMessageHandler<
  T extends ClientMessageDto['type'] = ClientMessageDto['type'],
> {
  readonly type: T;
  /** Answers the message, or throws for the socket server to answer with an error. */
  handle(
    message: Extract<ClientMessageDto, { type: T }>,
    connection: RoomConnection,
  ): Promise<void>;
}
