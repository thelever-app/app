import type { ClientMessageDto, ServerMessageDto } from '@thelever-app/protocol';

export type ServerMessageListener = (message: ServerMessageDto) => void;

/**
 * How the link to the room is doing, as the browser sees it; the server never sends it. Rejected
 * is for good: the server will not take the player back, and the error it sent says why.
 */
export type RoomConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'rejected';

export type RoomConnectionStatusListener = (status: RoomConnectionStatus) => void;

/** The screen's link to a room: simulated in the browser, or a WebSocket to the room server. */
export interface RoomConnection {
  send(message: ClientMessageDto): void;
  /** Returns the function that unsubscribes the listener. */
  subscribe(listener: ServerMessageListener): () => void;
  /** Tells the listener the current status at once and every change after it; returns the function that unsubscribes it. */
  subscribeStatus(listener: RoomConnectionStatusListener): () => void;
  /** The current status, read without side effects. */
  getStatus(): RoomConnectionStatus;
  close(): void;
}
