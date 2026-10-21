import type { ClientMessageDto, ServerMessageDto } from '@thelever-app/protocol';

export type ServerMessageListener = (message: ServerMessageDto) => void;

/** The screen's link to a room. Simulated in the browser now (TSK-18), a WebSocket in TSK-24. */
export interface RoomConnection {
  send(message: ClientMessageDto): void;
  /** Returns the function that unsubscribes the listener. */
  subscribe(listener: ServerMessageListener): () => void;
  close(): void;
}
