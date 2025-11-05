// Simple WebSocket relay server with static file serving
// Run: npm install && npm start

const path = require('path');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Serve the repository root so existing /lib and other assets remain available.
// This makes it convenient to run the server from the chat-room folder while
// still using shared assets in the repo (e.g., /lib/spine-phaser.min.js).
const repoRoot = path.resolve(__dirname, '../../..');
app.use(express.static(repoRoot));

// Also serve the local public folder under the server root (chat-room client)
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map(); // id -> ws
const playerPositions = new Map(); // id -> { x, y }
const playerNames = new Map(); // id -> name
const playerSkins = new Map(); // id -> skin

function broadcast(obj, excludeWs) {
  const msg = JSON.stringify(obj);
  for (const [id, ws] of clients) {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

// Heartbeat helpers
function noop() {}
function heartbeat() { this.isAlive = true; }

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  const id = 'user_' + uuidv4();
  clients.set(id, ws);
  playerPositions.set(id, { x: 1000, y: 1000 }); // Initialize position
  console.log(`Client connected: ${id} (${req.socket.remoteAddress})`);

  // Welcome the new client with their ID
  ws.send(JSON.stringify({ type: 'welcome', id }));

  // Send state sync - tell new client about all existing players with their current positions, names, and skins
  const stateSync = {
    type: 'stateSync',
    players: Array.from(clients.entries()).map(([playerId, _]) => {
      if (playerId === id) return null;
      const pos = playerPositions.get(playerId) || { x: 1000, y: 1000 };
      const name = playerNames.get(playerId) || 'Unknown';
      const skin = playerSkins.get(playerId) || 'default';
      return { id: playerId, x: pos.x, y: pos.y, name, skin };
    }).filter(p => p !== null)
  };
  ws.send(JSON.stringify(stateSync));

  ws.on('message', (raw) => {
    if (!raw) return;
    // Basic guard: limit size
    if (raw.length > 12_000) return;

    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg.type) return;

    switch (msg.type) {
      case 'playerJoined':
        // Store the player's name and skin when they join
        const name = typeof msg.name === 'string' ? msg.name.slice(0, 20) : 'Anonymous';
        const skin = typeof msg.skin === 'string' ? msg.skin.slice(0, 50) : 'default';
        playerNames.set(id, name);
        playerSkins.set(id, skin);
        console.log(`Player ${id} joined as: ${name} (skin: ${skin})`);
        // Broadcast to all clients that a player joined with their name and skin
        broadcast({ type: 'playerJoined', id, x: 1000, y: 1000, name, skin }, ws);
        break;
      case 'move':
        playerPositions.set(id, { x: msg.x, y: msg.y }); // Update position
        broadcast({ type: 'update', id, dataType: 'move', x: msg.x, y: msg.y }, ws);
        break;
      case 'animate':
        broadcast({ type: 'update', id, dataType: 'animate', animation: msg.animation }, ws);
        break;
      case 'chat':
        // Limit chat length server-side
        const text = typeof msg.message === 'string' ? msg.message.slice(0, 500) : '';
        broadcast({ type: 'update', id, dataType: 'chat', message: text }, ws);
        break;
      default:
        break;
    }
  });

  ws.on('close', () => {
    clients.delete(id);
    playerPositions.delete(id); // Clean up position data
    playerNames.delete(id); // Clean up name data
    playerSkins.delete(id); // Clean up skin data
    broadcast({ type: 'playerLeft', id });
    console.log(`Client disconnected: ${id}`);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error for', id, err && err.message);
  });
});

// Periodic ping to detect dead connections
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
  console.log(`Open ${'http://localhost:' + PORT + '/games/10-networked/chat-room/public/index.html'} in your browser`);
});
