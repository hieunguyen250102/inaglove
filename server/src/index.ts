import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server, type Socket } from 'socket.io';
import { REACTIONS, type Ack, type ChipColor, type JoinResult } from '../../shared/types';
import { GameError, Room } from './room';

const PORT = Number(process.env.PORT ?? 3001);
// Comma-separated list of allowed browser origins (e.g. your Vercel URL). Empty = allow all.
const ORIGINS = (process.env.CLIENT_ORIGIN ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const ROOM_TTL_MS = 30 * 60_000;

const app = express();
app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

// Single-service deploys: serve the built client when it sits next to the server.
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = process.env.CLIENT_DIST ?? path.resolve(here, '../../client/dist');
if (existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist, { maxAge: '1h', index: false }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log(`Serving client from ${clientDist}`);
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: ORIGINS.length ? ORIGINS : true },
  pingInterval: 20_000,
  pingTimeout: 25_000,
});

const rooms = new Map<string, Room>();

function newCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (;;) {
    let code = '';
    for (let i = 0; i < 4; i++) code += letters[Math.floor(Math.random() * letters.length)];
    if (!rooms.has(code)) return code;
  }
}

function createRoom() {
  const room = new Room(newCode());
  room.onMessage = (msg) => io.to(room.code).emit('chat:message', msg);
  rooms.set(room.code, room);
  return room;
}

function broadcast(room: Room) {
  const sids = io.sockets.adapter.rooms.get(room.code);
  if (!sids) return;
  for (const sid of sids) {
    const s = io.sockets.sockets.get(sid);
    if (s?.data.token) s.emit('state', room.viewFor(s.data.token));
  }
}

interface SocketData {
  code?: string;
  token?: string;
  chatTimes: number[];
}

io.on('connection', (socket: Socket) => {
  const data = socket.data as SocketData;
  data.chatTimes = [];

  const current = () => {
    const room = data.code ? rooms.get(data.code) : undefined;
    if (!room || !data.token) throw new GameError('Bạn chưa vào phòng.');
    const id = room.memberId(data.token);
    if (!id) throw new GameError('Bạn không còn ở trong phòng.');
    return { room, id, token: data.token };
  };

  /** Wraps a handler: runs it, acks the result, and broadcasts the new state. */
  const on = <P,>(event: string, handler: (payload: P) => unknown) => {
    socket.on(event, (payload: P, ack?: Ack) => {
      try {
        const result = handler(payload ?? ({} as P));
        ack?.({ ok: true, data: result });
      } catch (err) {
        const error = err instanceof GameError ? err.message : 'Có lỗi xảy ra.';
        if (!(err instanceof GameError)) console.error(err);
        ack?.({ ok: false, error });
      }
      const room = data.code ? rooms.get(data.code) : undefined;
      if (room) broadcast(room);
    });
  };

  const enter = (room: Room, name: string, token?: string): JoinResult => {
    leaveCurrent(false);
    const joined = room.join(name, token);
    data.code = room.code;
    data.token = joined.token;
    socket.join(room.code);
    room.connect(joined.token);
    socket.emit('chat:history', room.chat);
    return { code: room.code, token: joined.token, youId: joined.id };
  };

  const leaveCurrent = (explicit: boolean) => {
    const room = data.code ? rooms.get(data.code) : undefined;
    if (!room || !data.token) return;
    if (explicit) room.leave(data.token);
    else room.disconnect(data.token);
    socket.leave(room.code);
    data.code = undefined;
    data.token = undefined;
    broadcast(room);
  };

  on<{ name: string }>('room:create', ({ name }) => enter(createRoom(), name));

  on<{ code: string; name: string; token?: string }>('room:join', ({ code, name, token }) => {
    const room = rooms.get(String(code ?? '').trim().toUpperCase());
    if (!room) throw new GameError('Không tìm thấy phòng này.');
    return enter(room, name, token);
  });

  on('room:leave', () => leaveCurrent(true));

  on<{ color: ChipColor }>('lobby:color', ({ color }) => {
    const { room, id } = current();
    room.setColor(id, color);
  });

  on<{ playerId: string }>('lobby:kick', ({ playerId }) => {
    const { room, id } = current();
    const token = room.kick(id, playerId);
    for (const sid of io.sockets.adapter.rooms.get(room.code) ?? []) {
      const s = io.sockets.sockets.get(sid);
      if (s?.data.token === token) {
        s.leave(room.code);
        s.data.code = undefined;
        s.data.token = undefined;
        s.emit('kicked');
      }
    }
  });

  on('game:start', () => {
    const { room, id } = current();
    room.start(id);
  });
  on('game:alibiReady', () => {
    const { room, id } = current();
    room.alibiReady(id);
  });
  on<{ suspect: number }>('game:peek', ({ suspect }) => {
    const { room, id } = current();
    room.peek(id, Number(suspect));
  });
  on<{ suspect: number }>('game:accuse', ({ suspect }) => {
    const { room, id } = current();
    room.accuse(id, Number(suspect));
  });
  on('game:continue', () => {
    const { room, id } = current();
    room.continue(id);
  });
  on('game:restart', () => {
    const { room, id } = current();
    room.restart(id);
  });

  on<{ text: string }>('chat:send', ({ text }) => {
    const { room, token } = current();
    const now = Date.now();
    data.chatTimes = data.chatTimes.filter((t) => now - t < 5_000);
    if (data.chatTimes.length >= 6) throw new GameError('Bạn gửi hơi nhanh, chờ chút nhé.');
    data.chatTimes.push(now);
    room.say(token, String(text ?? ''));
  });

  socket.on('chat:typing', () => {
    try {
      const { room, id } = current();
      socket.to(room.code).emit('chat:typing', { playerId: id, name: room.memberName(data.token!) });
    } catch {
      /* not in a room */
    }
  });

  socket.on('react', (payload?: { emoji?: string }) => {
    const emoji = String(payload?.emoji ?? '');
    try {
      const { room, id } = current();
      if (!(REACTIONS as readonly string[]).includes(emoji)) return;
      io.to(room.code).emit('react', { playerId: id, emoji, id: `${Date.now()}-${Math.random()}` });
    } catch {
      /* not in a room */
    }
  });

  socket.on('disconnect', () => leaveCurrent(false));
});

// Auto-play for absent players and cleanup of abandoned rooms.
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.emptySince !== null && now - room.emptySince > ROOM_TTL_MS) {
      rooms.delete(code);
      continue;
    }
    try {
      if (room.tick()) broadcast(room);
    } catch (err) {
      console.error(`tick failed in ${code}`, err);
    }
  }
}, 1_000);

httpServer.listen(PORT, () => {
  console.log(`In a Grove server listening on :${PORT}`);
});
