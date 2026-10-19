const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const rooms = new Map();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function send(socket, payload) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload));
}

function broadcast(room, payload, except = null) {
  room.players.forEach((player) => {
    if (player.socket !== except) send(player.socket, payload);
  });
}

function makeCode() {
  let code;
  do {
    code = crypto.randomBytes(3).toString('hex').toUpperCase();
  } while (rooms.has(code));
  return code;
}

function roomSummary(room) {
  return {
    code: room.code,
    players: room.players.length,
    host: room.players[0]?.name || 'المضيف',
    status: room.status,
    settings: room.settings || null
  };
}

const server = http.createServer((req, res) => {
  let requestPath = decodeURIComponent(req.url.split('?')[0]);
  if (requestPath === '/') requestPath = '/index.html';
  const safePath = path.normalize(requestPath).replace(/^([.][.][/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
    }
    res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

wss.on('connection', (socket) => {
  socket.roomCode = null;
  socket.playerId = crypto.randomUUID();

  socket.on('message', (raw) => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return send(socket, { type: 'error', message: 'الرسالة غير صالحة.' }); }

    if (message.type === 'create-room') {
      if (socket.roomCode) return send(socket, { type: 'error', message: 'أنت داخل غرفة بالفعل.' });
      const code = makeCode();
      const room = { code, players: [], status: 'waiting', settings: message.settings || null, createdAt: Date.now() };
      const player = { id: socket.playerId, socket, name: message.name || 'سائق', selection: message.selection || null, ready: false };
      room.players.push(player); rooms.set(code, room); socket.roomCode = code;
      return send(socket, { type: 'room-created', code, playerId: player.id, summary: roomSummary(room) });
    }

    if (message.type === 'join-room') {
      const code = String(message.code || '').trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) return send(socket, { type: 'error', message: 'الكود غير موجود أو انتهت الغرفة.' });
      if (room.players.length >= 2) return send(socket, { type: 'error', message: 'الغرفة ممتلئة بالفعل.' });
      if (socket.roomCode) return send(socket, { type: 'error', message: 'أنت داخل غرفة بالفعل.' });
      const player = { id: socket.playerId, socket, name: message.name || 'سائق', selection: message.selection || null, ready: false };
      room.players.push(player); socket.roomCode = code;
      send(socket, { type: 'room-joined', code, playerId: player.id, summary: roomSummary(room), opponent: room.players[0].selection || null });
      return broadcast(room, { type: 'room-update', summary: roomSummary(room), players: room.players.map((p) => ({ id: p.id, name: p.name, selection: p.selection, ready: p.ready })) });
    }

    const room = socket.roomCode ? rooms.get(socket.roomCode) : null;
    if (!room) return send(socket, { type: 'error', message: 'أنشئ غرفة أو انضم إلى غرفة أولًا.' });
    const player = room.players.find((p) => p.socket === socket);

    if (message.type === 'update-selection') {
      if (player) player.selection = message.selection || null;
      return broadcast(room, { type: 'room-update', summary: roomSummary(room), players: room.players.map((p) => ({ id: p.id, name: p.name, selection: p.selection, ready: p.ready })) });
    }

    if (message.type === 'ready') {
      if (player) player.ready = Boolean(message.value);
      if (room.players.length === 2 && room.players.every((p) => p.ready)) {
        room.status = 'racing';
        broadcast(room, { type: 'race-start', seed: Math.floor(Math.random() * 1000000), players: room.players.map((p) => ({ id: p.id, name: p.name, selection: p.selection })) });
      } else {
        broadcast(room, { type: 'room-update', summary: roomSummary(room), players: room.players.map((p) => ({ id: p.id, name: p.name, selection: p.selection, ready: p.ready })) });
      }
      return;
    }

    if (message.type === 'race-state') {
      return broadcast(room, { type: 'race-state', from: socket.playerId, state: message.state }, socket);
    }

    if (message.type === 'race-finished') {
      return broadcast(room, { type: 'race-finished', from: socket.playerId, result: message.result || null }, socket);
    }
  });

  socket.on('close', () => {
    const room = socket.roomCode ? rooms.get(socket.roomCode) : null;
    if (!room) return;
    room.players = room.players.filter((p) => p.socket !== socket);
    if (!room.players.length) return rooms.delete(room.code);
    room.status = 'waiting';
    room.players.forEach((p) => { p.ready = false; });
    broadcast(room, { type: 'opponent-left', summary: roomSummary(room) });
    broadcast(room, { type: 'room-update', summary: roomSummary(room), players: room.players.map((p) => ({ id: p.id, name: p.name, selection: p.selection, ready: p.ready })) });
  });
});

server.listen(PORT, () => {
  console.log(`Barq Racing running at http://localhost:${PORT}`);
});
