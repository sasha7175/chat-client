#!/usr/bin/env node
// Simple WebSocket test client to simulate multiple players

const WebSocket = require('ws');

const SERVER_URL = process.env.SERVER_URL || 'ws://localhost:8080';
const NUM_CLIENTS = process.env.NUM_CLIENTS || 3;

const clients = [];
let messageCount = 0;

function createTestClient(index) {
  return new Promise((resolve) => {
    const ws = new WebSocket(SERVER_URL);
    let clientId = null;

    ws.on('open', () => {
      console.log(`[Client ${index}] Connected`);
      resolve({ ws, clientId: null, index });
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        messageCount++;

        if (msg.type === 'welcome') {
          clientId = msg.id;
          console.log(`[Client ${index}] Got ID: ${clientId}`);
          
          // Announce join
          ws.send(JSON.stringify({ 
            type: 'playerJoined', 
            name: `TestBot${index}`, 
            skin: 'mario' 
          }));
        } else if (msg.type === 'bulkUpdate') {
          // New batched updates
          console.log(`[Client ${index}] Received bulk update with ${msg.updates?.length || 0} position updates`);
        } else if (msg.type === 'update') {
          // Individual updates (chat, animation)
          if (msg.dataType !== 'move') {
            console.log(`[Client ${index}] Received ${msg.dataType} update from ${msg.id}`);
          }
        } else if (msg.type === 'stateSync') {
          console.log(`[Client ${index}] State sync: ${msg.players?.length || 0} players`);
        }
      } catch (e) {
        console.error(`[Client ${index}] Parse error:`, e.message);
      }
    });

    ws.on('error', (err) => {
      console.error(`[Client ${index}] Error:`, err.message);
    });

    ws.on('close', () => {
      console.log(`[Client ${index}] Disconnected`);
    });
  });
}

async function startSimulation() {
  console.log(`Connecting ${NUM_CLIENTS} test clients to ${SERVER_URL}...`);

  // Connect all clients
  for (let i = 0; i < NUM_CLIENTS; i++) {
    const client = await createTestClient(i);
    clients.push(client);
  }

  console.log(`All clients connected. Starting movement simulation...`);

  // Simulate movement
  let frame = 0;
  setInterval(() => {
    frame++;
    
    clients.forEach((client, idx) => {
      // Move in a circle
      const angle = (frame / 60 + (idx * Math.PI * 2) / NUM_CLIENTS) % (Math.PI * 2);
      const x = 1000 + Math.cos(angle) * 200;
      const y = 1000 + Math.sin(angle) * 200;

      client.ws.send(JSON.stringify({
        type: 'move',
        x: Math.round(x),
        y: Math.round(y)
      }));
    });

    if (frame % 300 === 0) {
      console.log(`\n📊 Stats - Frame: ${frame}, Total messages received: ${messageCount}`);
      messageCount = 0;
    }
  }, 100); // Send every 100ms like the client does

  console.log('Running test. Press Ctrl+C to stop.');
}

startSimulation().catch(console.error);
