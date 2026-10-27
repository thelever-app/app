import type { ClientMessageDto, ServerMessageDto } from '@thelever-app/protocol';

export type ServerMessageListener = (message: ServerMessageDto) => void;

/** How the link to the room is doing, as the browser sees it; the server never sends it. */
export type RoomConnectionStatus = 'connecting' | 'connected' | 'reconnecting';

export type RoomConnectionStatusListener = (status: RoomConnectionStatus) => void;

/** The screen's link to a room: simulated in the browser, or a WebSocket to the room server. */
export interface RoomConnection {
  send(message: ClientMessageDto): void;
  /** Returns the function that unsubscribes the listener. */
  subscribe(listener: ServerMessageListener): () => void;
  /** Tells the listener the current status at once and every change after it; returns the function that unsubscribes it. */
  subscribeStatus(listener: RoomConnectionStatusListener): () => void;
  close(): void;
}
