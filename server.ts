import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

app.use(express.json());

// API health and info
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: Date.now() });
});

// Multiplayer Room Management
interface PlayerConnection {
  id: string;
  ws: WebSocket;
  team: 'blue' | 'orange';
  name: string;
  carBody: string;
  boostColor: string;
  ready: boolean;
  ping: number;
}

interface Room {
  id: string;
  mode: 'soccer' | 'basketball';
  players: Map<string, PlayerConnection>;
  state: {
    timeRemaining: number;
    scoreBlue: number;
    scoreOrange: number;
    isOvertime: boolean;
    gameState: 'waiting' | 'countdown' | 'playing' | 'goal' | 'gameover';
    ball: {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
    };
  };
  lastUpdate: number;
}

const rooms = new Map<string, Room>();

// WebSocket Server
const wss = new WebSocketServer({ server });

function broadcastToRoom(room: Room, message: object, excludePlayerId?: string) {
  const data = JSON.stringify(message);
  for (const [id, player] of room.players) {
    if (id !== excludePlayerId && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  }
}

wss.on('connection', (ws: WebSocket) => {
  let currentRoomId: string | null = null;
  let playerId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'join_room') {
        const roomIdStr: string = (msg.roomId || 'QUICKMATCH').toUpperCase();
        const pIdStr: string = msg.playerId || 'p_' + Math.random().toString(36).substring(2, 9);
        currentRoomId = roomIdStr;
        playerId = pIdStr;

        let room = rooms.get(roomIdStr);
        if (!room) {
          const gameMode = msg.mode === 'basketball' ? 'basketball' : 'soccer';
          room = {
            id: roomIdStr,
            mode: gameMode,
            players: new Map(),
            state: {
              timeRemaining: 300,
              scoreBlue: 0,
              scoreOrange: 0,
              isOvertime: false,
              gameState: 'waiting',
              ball: { x: 0, y: gameMode === 'basketball' ? 5 : 2.5, z: 0, vx: 0, vy: 0, vz: 0 },
            },
            lastUpdate: Date.now(),
          };
          rooms.set(roomIdStr, room);
        }

        // Determine team assignment based on current count
        let blueCount = 0;
        let orangeCount = 0;
        for (const p of room.players.values()) {
          if (p.team === 'blue') blueCount++;
          else orangeCount++;
        }
        const team: 'blue' | 'orange' = blueCount <= orangeCount ? 'blue' : 'orange';

        const playerConn: PlayerConnection = {
          id: pIdStr,
          ws,
          team,
          name: msg.playerName || (team === 'blue' ? 'Blue Striker' : 'Orange Ace'),
          carBody: msg.carBody || 'octane',
          boostColor: msg.boostColor || (team === 'blue' ? '#00f0ff' : '#ff7700'),
          ready: true,
          ping: 0,
        };

        room.players.set(pIdStr, playerConn);

        // Notify client of successful join
        const existingPlayers = Array.from(room.players.values()).map(p => ({
          id: p.id,
          team: p.team,
          name: p.name,
          carBody: p.carBody,
          boostColor: p.boostColor,
        }));

        ws.send(JSON.stringify({
          type: 'room_joined',
          roomId: roomIdStr,
          playerId: pIdStr,
          team,
          mode: room.mode,
          players: existingPlayers,
          roomState: room.state,
        }));

        // Notify others
        broadcastToRoom(room, {
          type: 'player_joined',
          player: {
            id: pIdStr,
            team,
            name: playerConn.name,
            carBody: playerConn.carBody,
            boostColor: playerConn.boostColor,
          },
        }, pIdStr);

        // If at least 2 players are present and waiting, start game countdown
        if (room.players.size >= 2 && room.state.gameState === 'waiting') {
          room.state.gameState = 'countdown';
          broadcastToRoom(room, {
            type: 'match_start_countdown',
            seconds: 3,
          });
        }
      } else if (msg.type === 'player_sync') {
        // Relay position/velocity/boost/inputs to other players in the room
        if (currentRoomId && playerId) {
          const room = rooms.get(currentRoomId);
          if (room) {
            broadcastToRoom(room, {
              type: 'player_update',
              playerId,
              transform: msg.transform,
              boost: msg.boost,
              isBoosting: msg.isBoosting,
              isSupersonic: msg.isSupersonic,
              isDodging: msg.isDodging,
            }, playerId);
          }
        }
      } else if (msg.type === 'ball_sync') {
        // Host / authoritative client ball update
        if (currentRoomId) {
          const room = rooms.get(currentRoomId);
          if (room) {
            room.state.ball = msg.ball;
            broadcastToRoom(room, {
              type: 'ball_update',
              ball: msg.ball,
              senderId: playerId || undefined,
            }, playerId || undefined);
          }
        }
      } else if (msg.type === 'goal_scored') {
        if (currentRoomId) {
          const room = rooms.get(currentRoomId);
          if (room) {
            if (msg.team === 'blue') room.state.scoreBlue++;
            else if (msg.team === 'orange') room.state.scoreOrange++;
            
            room.state.gameState = 'goal';
            broadcastToRoom(room, {
              type: 'goal_event',
              team: msg.team,
              scorer: msg.scorer,
              speedKph: msg.speedKph,
              scoreBlue: room.state.scoreBlue,
              scoreOrange: room.state.scoreOrange,
            });
          }
        }
      } else if (msg.type === 'chat_message') {
        if (currentRoomId) {
          const room = rooms.get(currentRoomId);
          if (room) {
            broadcastToRoom(room, {
              type: 'chat',
              sender: msg.sender,
              team: msg.team,
              text: msg.text,
            });
          }
        }
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', time: msg.time }));
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && playerId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.players.delete(playerId);
        broadcastToRoom(room, {
          type: 'player_left',
          playerId,
        });

        if (room.players.size === 0) {
          rooms.delete(currentRoomId);
        }
      }
    }
  });
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(port, () => {
    console.log(`Nitro League server running on http://0.0.0.0:${port}`);
  });
}

startServer();
