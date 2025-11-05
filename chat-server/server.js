// Simple WebSocket relay server with static file serving
// Run: npm install && npm start

const path = require('path');
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Test endpoint to verify server is working
app.get('/test', (req, res) => {
  res.json({
    message: 'Server is working!',
    timestamp: new Date().toISOString(),
    server: 'Phaser Spine Chatroom Server',
    port: PORT,
    uptime: process.uptime()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Root endpoint with server info
app.get('/', (req, res) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const protocol = isHttps ? 'https' : 'http';
  const port = isHttps ? HTTPS_PORT : PORT;
  const hostname = req.hostname || 'localhost';
  const httpUrl = `http://${hostname}:${PORT}`;
  const httpsUrl = httpsServer ? `https://${hostname}:${HTTPS_PORT}` : null;
  const wsHint = httpsServer
    ? `
        <div style="background: #e8f5e8; padding: 10px; border-radius: 5px; margin: 10px 0;">
          <h3>� Available Endpoints:</h3>
          <ul>
            <li><strong>HTTP (Recommended):</strong> <a href="${httpUrl}">${httpUrl}</a> - Best WebSocket compatibility</li>
            <li><strong>HTTPS:</strong> <a href="${httpsUrl}">${httpsUrl}</a> - Self-signed certificate may block WebSockets</li>
          </ul>
        </div>
        `
    : `
        <div style="background: #d4edda; padding: 10px; border-radius: 5px; margin: 10px 0;">
          <strong>✅ HTTP Endpoint:</strong> <a href="${httpUrl}">${httpUrl}</a> (best WebSocket compatibility)
        </div>
        `;
  const gamePath = '/index.html';
  
  res.send(`
    <html>
      <head><title>Phaser Spine Chatroom Server</title></head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1>🎮 Phaser Spine Chatroom Server</h1>
        <p><strong>Status:</strong> Running</p>
        <p><strong>Protocol:</strong> ${protocol.toUpperCase()}</p>
        <p><strong>Port:</strong> ${port}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        ${wsHint}
        
        <h2>Test Endpoints:</h2>
        <ul>
          <li><a href="/test">/test</a> - JSON response</li>
          <li><a href="/health">/health</a> - Health check</li>
        </ul>
        <h2>Game:</h2>
        <p>Game client should be available at: <a href="${gamePath}">${gamePath}</a></p>
        
        ${isHttps ? `
        <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0;">
          <strong>⚠️ WebSocket SSL Warning:</strong> Self-signed certificates cause WebSocket connection failures in browsers. 
          <br>For chat functionality, use the <a href="${httpUrl}">HTTP endpoint</a> instead.
        </div>
        ` : `
        <div style="background: #d4edda; padding: 10px; border-radius: 5px; margin: 10px 0;">
          <strong>✅ Optimal Setup:</strong> HTTP version provides the best WebSocket compatibility for chat functionality.
        </div>
        `}
      </body>
    </html>
  `);
});

// Serve the chat-client folder directly from chat-server directory
// This allows the server to work when deployed standalone
app.use(express.static(path.join(__dirname, 'chat-client')));

// Also serve the local public folder under the server root
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);

// HTTPS server setup (optional)
let httpsServer = null;

// Check if SSL certificates exist
const sslKeyPath = './ssl/private-key.pem';
const sslCertPath = './ssl/certificate.pem';

if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
  const httpsOptions = {
    key: fs.readFileSync(sslKeyPath),
    cert: fs.readFileSync(sslCertPath),
    // Add options to make self-signed certificates work better
    rejectUnauthorized: false,
    requestCert: false
  };
  
  httpsServer = https.createServer(httpsOptions, app);
  console.log('SSL certificates found - HTTPS will be available');
  console.log('Note: Self-signed certificate may cause WebSocket issues in browsers');
} else {
  console.log('SSL certificates not found - only HTTP will be available');
  console.log('To enable HTTPS, create SSL certificates in ./ssl/ directory');
}
// Setup WebSocket servers
let wss, httpsWss;

if (httpsServer) {
  // HTTP WebSocket server (primary - better compatibility)
  wss = new WebSocket.Server({ server });
  
  // HTTPS WebSocket server (secondary - may have cert issues)
  httpsWss = new WebSocket.Server({ 
    server: httpsServer,
    verifyClient: (info) => {
      // Accept all connections but log any certificate issues
      return true;
    }
  });
  
  // Add error handling for HTTPS server
  httpsServer.on('clientError', (err, socket) => {
    console.log('HTTPS Client Error:', err.message);
    if (socket.writable) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    }
  });
} else {
  // HTTP WebSocket server only
  wss = new WebSocket.Server({ server });
}

const clients = new Map(); // id -> ws
const playerPositions = new Map(); // id -> { x, y }
const playerNames = new Map(); // id -> name
const playerSkins = new Map(); // id -> skin
const pendingUpdates = new Map(); // id -> { x, y } for batched position updates

const UPDATE_RATE_MS = 100; // Send position updates every 100ms (~10 Hz)
const WORLD_SIZE = 2000; // World size for randomized spawn zone
let updateTickActive = false;

function getRandomSpawnPosition() {
  const center = WORLD_SIZE / 2;
  const zoneSize = WORLD_SIZE * 0.05; // 5% of world size
  const x = Math.round(center + (Math.random() - 0.5) * 2 * zoneSize);
  const y = Math.round(center + (Math.random() - 0.5) * 2 * zoneSize);
  return { x, y };
}

function broadcast(obj, excludeWs) {
  const msg = JSON.stringify(obj);
  for (const [id, ws] of clients) {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

// Batch position updates and send them at fixed intervals
function processPendingUpdates() {
  if (pendingUpdates.size === 0) {
    updateTickActive = false;
    return;
  }
  
  const updates = [];
  for (const [id, pos] of pendingUpdates) {
    updates.push({ id, x: Math.round(pos.x), y: Math.round(pos.y) });
  }
  pendingUpdates.clear();
  
  console.log(`[Server] Sending bulkUpdate with ${updates.length} positions to ${clients.size} clients`);
  const msg = JSON.stringify({ type: 'bulkUpdate', updates });
  for (const [_, ws] of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
  
  // Reschedule for next batch
  setTimeout(processPendingUpdates, UPDATE_RATE_MS);
}

function schedulePositionUpdate() {
  if (!updateTickActive) {
    updateTickActive = true;
    setTimeout(processPendingUpdates, UPDATE_RATE_MS);
  }
}

// Heartbeat helpers
function noop() {}
function heartbeat() { this.isAlive = true; }

// WebSocket connection handler
function handleWebSocketConnection(ws, req) {
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  const id = 'user_' + uuidv4();
  clients.set(id, ws);
  const spawnPos = getRandomSpawnPosition();
  playerPositions.set(id, spawnPos); // Initialize with randomized spawn position
  console.log(`Client connected: ${id} (${req.socket.remoteAddress}) at [${spawnPos.x}, ${spawnPos.y}]`);

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
        const pos = playerPositions.get(id);
        console.log(`Player ${id} joined as: ${name} (skin: ${skin}) at [${pos.x}, ${pos.y}]`);
        // Broadcast to all clients that a player joined with their name, skin, and actual spawn position
        broadcast({ type: 'playerJoined', id, x: pos.x, y: pos.y, name, skin }, ws);
        break;
      case 'move':
        playerPositions.set(id, { x: msg.x, y: msg.y }); // Update position
        pendingUpdates.set(id, { x: msg.x, y: msg.y }); // Queue for batch send
        schedulePositionUpdate();
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
}

wss.on('connection', handleWebSocketConnection);
if (httpsWss) {
  httpsWss.on('connection', handleWebSocketConnection);
}

// Periodic ping to detect dead connections
setInterval(() => {
  const allClients = [...wss.clients];
  if (httpsWss) {
    allClients.push(...httpsWss.clients);
  }
  
  allClients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// For better compatibility, run HTTP on main port and HTTPS on alternate port
if (httpsServer) {
  // Start HTTP server on main port (better WebSocket compatibility)
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP Server listening on http://0.0.0.0:${PORT}`);
    console.log(`Open http://localhost:${PORT} (or your server IP) in your browser`);
    console.log('Recommended: Use HTTP version for better WebSocket compatibility');
  });
  
  // Start HTTPS server on alternate port
  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`HTTPS Server listening on https://0.0.0.0:${HTTPS_PORT}`);
    console.log(`Open https://localhost:${HTTPS_PORT} (self-signed certificate)`);
    console.log('Note: HTTPS may have WebSocket issues with self-signed certificates');
  });
} else {
  // Fallback to HTTP only if no SSL certificates
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP Server listening on http://0.0.0.0:${PORT}`);
    console.log(`Open http://localhost:${PORT} (or your server IP) in your browser`);
  });
}
