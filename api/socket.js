import { createServer } from 'http';
import { Server } from 'socket.io';

const server = createServer();
const io = new Server(server, {
  path: '/api/socket',
  cors: { origin: '*' },
});

// In-memory player registry. NOTE: on Vercel, a WebSocket connection is
// pinned to one Function instance for its lifetime, but future connections
// aren't guaranteed to land on the same instance. For light/testing traffic
// this in-memory Map works fine. If you scale up and players stop seeing
// each other, move this state into Redis (Upstash) pub/sub instead.
const players = new Map();

io.on('connection', (socket) => {
  socket.on('join', (data) => {
    const player = {
      id: socket.id,
      name: String(data?.name || 'Petualang').slice(0, 20),
      classLabel: data?.classLabel || '',
      classAccent: data?.classAccent || '#7C5CFC',
      skin: data?.skin || '#F0B98D',
      hair: data?.hair || '#1C1B1F',
      outfit: data?.outfit || '#3D7A63',
      x: typeof data?.x === 'number' ? data.x : 88,
      y: typeof data?.y === 'number' ? data.y : 312,
      facing: 'down',
      moving: false,
    };
    players.set(socket.id, player);

    socket.emit('init', {
      id: socket.id,
      players: Object.fromEntries(players),
    });
    socket.broadcast.emit('player-joined', player);
  });

  socket.on('move', (data) => {
    const p = players.get(socket.id);
    if (!p || typeof data?.x !== 'number' || typeof data?.y !== 'number') return;
    p.x = data.x;
    p.y = data.y;
    p.facing = data.facing || p.facing;
    p.moving = !!data.moving;
    socket.broadcast.emit('player-moved', {
      id: socket.id,
      x: p.x,
      y: p.y,
      facing: p.facing,
      moving: p.moving,
    });
  });

  socket.on('chat', (data) => {
    const p = players.get(socket.id);
    const text = String(data?.text || '').slice(0, 200).trim();
    if (!text) return;
    io.emit('chat-message', {
      id: socket.id,
      name: p ? p.name : 'Tamu',
      text,
      ts: Date.now(),
    });
  });

  socket.on('ping-check', (t) => {
    socket.emit('pong-check', t);
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
    io.emit('player-left', { id: socket.id });
  });
});

export default server;
