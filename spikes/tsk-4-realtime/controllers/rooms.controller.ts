import { WebSocket } from 'ws';
import { RoomsRepository } from '../repositories/rooms.repository';

export class RoomsController {
  readonly socketRoomMap = new Map<WebSocket, string>();
  readonly socketPlayerMap = new Map<WebSocket, string>();

  constructor(private readonly roomsRepository: RoomsRepository) {}

  createRoom(socket: WebSocket): { roomId: string } {
    const { roomId } = this.roomsRepository.createRoom();
    this.socketRoomMap.set(socket, roomId);
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'room_created', data: { roomId } }));
    }
    return { roomId };
  }

  joinRoom(socket: WebSocket, roomId: string, playerId: string): void;
  joinRoom(socket: WebSocket, playerId: string): void;
  joinRoom(socket: WebSocket, arg1: string, arg2?: string): void {
    let roomId: string | undefined;
    let playerId: string;

    if (arg2 !== undefined) {
      roomId = arg1;
      playerId = arg2;
    } else {
      playerId = arg1;
      roomId = this.socketRoomMap.get(socket);
    }

    if (!roomId) {
      throw new Error('Socket not found in room');
    }

    this.socketRoomMap.set(socket, roomId);
    this.socketPlayerMap.set(socket, playerId);
    this.roomsRepository.joinRoom(roomId, { playerId, socket });

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'room_joined', data: { roomId, playerId } }));
    }
  }

  leaveRoom(socket: WebSocket): void {
    const roomId = this.socketRoomMap.get(socket);
    if (!roomId) {
      throw new Error('Socket not found in room');
    }

    const playerId = this.socketPlayerMap.get(socket);
    this.socketRoomMap.delete(socket);
    if (playerId) {
      this.socketPlayerMap.delete(socket);
      this.roomsRepository.leaveRoom(roomId, playerId);
    } else {
      this.roomsRepository.leaveRoom(roomId);
    }

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'room_left', data: { roomId } }));
    }
  }

  getRoomPlayers(socket: WebSocket): void {
    const roomId = this.socketRoomMap.get(socket);
    if (!roomId) {
      throw new Error('Socket not found in room');
    }

    const players = this.roomsRepository.getRoomPlayers(roomId);
    const playerIds = players.map((player) => player.playerId);

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'room_players', data: { roomId, players: playerIds } }));
    }
  }

  broadcastProgress(socket: WebSocket, step: string, sentAt: number): void {
    const roomId = this.socketRoomMap.get(socket);
    if (!roomId) {
      throw new Error('Socket not found in room');
    }

    const players = this.roomsRepository.getRoomPlayers(roomId);
    players.forEach((player) => {
      if (player.socket.readyState === WebSocket.OPEN) {
        player.socket.send(JSON.stringify({ type: 'progress', data: { step, sentAt } }));
      }
    });
  }

  handleDisconnect(socket: WebSocket): void {
    if (this.socketRoomMap.has(socket)) {
      this.leaveRoom(socket);
    }
  }
}
