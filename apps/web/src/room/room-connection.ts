import type { ClientMessageDto, ServerMessageDto } from '@thelever-app/protocol';

export type ServerMessageListener = (message: ServerMessageDto) => void;

/** The screen's link to a room: simulated in the browser, or a WebSocket to the room server. */
export interface RoomConnection {
  send(message: ClientMessageDto): void;
  /** Returns the function that unsubscribes the listener. */
  subscribe(listener: ServerMessageListener): () => void;
  close(): void;
}
