import http from 'node:http';
import express from 'express';
import { WebSocketServer, type WebSocket } from 'ws';
import { RoomsController } from './controllers/rooms.controller';
import { RoomsRepository } from './repositories/rooms.repository';

const port = Number(process.env.PORT ?? 3000);

export const app = express();
app.use(express.json());

export const roomsRepository = new RoomsRepository();
export const roomsController = new RoomsController(roomsRepository);

app.get('/health', (_req, res) => {
  res.send({
    status: 'ok',
    rooms: roomsRepository.roomsCount,
    players: roomsRepository.totalPlayersCount,
  });
});

export const server = http.createServer(app);
export const wss = new WebSocketServer({ server });

interface ClientMessage {
  type: string;
  data?: Record<string, unknown>;
  roomId?: string;
  playerId?: string;
  step?: string;
  sentAt?: number;
}

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');
  ws.send(JSON.stringify({ type: 'connected', message: 'Hello, Client!' }));

  ws.on('message', (rawMessage) => {
    try {
      let parsed: ClientMessage;
      try {
        parsed = JSON.parse(rawMessage.toString()) as ClientMessage;
      } catch {
        parsed = { type: rawMessage.toString().trim() };
      }

      console.log('Received message:', parsed);
      const data = (parsed.data ?? {}) as Record<string, unknown>;

      switch (parsed.type) {
        case 'create_room':
        case 'room_create': {
          roomsController.createRoom(ws);
          break;
        }

        case 'join_room':
        case 'room_join': {
          const roomId = (parsed.roomId ?? data.roomId) as string | undefined;
          const playerId = (parsed.playerId ?? data.playerId) as string | undefined;

          if (!playerId) {
            ws.send(
              JSON.stringify({ type: 'error', message: 'playerId is required to join a room' }),
            );
            return;
          }

          if (roomId) {
            roomsController.joinRoom(ws, roomId, playerId);
          } else {
            roomsController.joinRoom(ws, playerId);
          }
          break;
        }

        case 'leave_room':
        case 'room_leave': {
          roomsController.leaveRoom(ws);
          break;
        }

        case 'get_room_players':
        case 'room_players': {
          roomsController.getRoomPlayers(ws);
          break;
        }

        case 'progress': {
          const step = String(parsed.step ?? data.step ?? '');
          const sentAt = Number(parsed.sentAt ?? data.sentAt ?? Date.now());
          roomsController.broadcastProgress(ws, step, sentAt);
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }

        default: {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: `Unknown message type: ${parsed.type}`,
            }),
          );
          break;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid message format';
      ws.send(JSON.stringify({ type: 'error', message }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    roomsController.handleDisconnect(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket client error:', error);
    roomsController.handleDisconnect(ws);
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}
