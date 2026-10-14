import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';

export interface Player {
  playerId: string;
  socket: WebSocket;
}

export class RoomsRepository {
  private readonly _rooms = new Set<string>();
  private readonly playersPerRoom = new Map<string, Map<string, Player>>();

  get rooms(): ReadonlySet<string> {
    return this._rooms;
  }

  get roomsCount(): number {
    return this._rooms.size;
  }

  get totalPlayersCount(): number {
    let total = 0;
    for (const players of this.playersPerRoom.values()) {
      total += players.size;
    }
    return total;
  }

  createRoom(): { roomId: string } {
    const roomId = randomUUID();
    this._rooms.add(roomId);
    this.playersPerRoom.set(roomId, new Map());
    return { roomId };
  }

  hasRoom(roomId: string): boolean {
    return this._rooms.has(roomId);
  }

  joinRoom(roomId: string, player: Player): void;
  joinRoom(roomId: string, playerId: string, socket: WebSocket): void;
  joinRoom(roomId: string, playerOrId: Player | string, maybeSocket?: WebSocket): void {
    if (!this._rooms.has(roomId)) {
      this._rooms.add(roomId);
    }

    let room = this.playersPerRoom.get(roomId);
    if (!room) {
      room = new Map();
      this.playersPerRoom.set(roomId, room);
    }

    if (typeof playerOrId === 'string') {
      if (!maybeSocket) {
        throw new Error('Socket is required when adding a player to a room');
      }
      room.set(playerOrId, { playerId: playerOrId, socket: maybeSocket });
    } else {
      room.set(playerOrId.playerId, playerOrId);
    }
  }

  leaveRoom(roomId: string, playerId: string): void;
  leaveRoom(playerIdOrRoomId: string): void;
  leaveRoom(firstId: string, maybePlayerId?: string): void {
    if (maybePlayerId !== undefined) {
      this.playersPerRoom.get(firstId)?.delete(maybePlayerId);
      return;
    }

    if (this.playersPerRoom.has(firstId)) {
      this.playersPerRoom.delete(firstId);
      this._rooms.delete(firstId);
      return;
    }

    for (const players of this.playersPerRoom.values()) {
      if (players.has(firstId)) {
        players.delete(firstId);
        return;
      }
    }
  }

  getRoomPlayers(roomId: string): Player[] {
    const room = this.playersPerRoom.get(roomId);
    if (!room) {
      return [];
    }
    return Array.from(room.values());
  }

  getRoomPlayerIds(roomId: string): string[] {
    const room = this.playersPerRoom.get(roomId);
    if (!room) {
      return [];
    }
    return Array.from(room.keys());
  }
}
