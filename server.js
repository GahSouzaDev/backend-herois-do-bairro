const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

const rooms = new Map();

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'join') {
      const roomId = data.roomId;
      if (!rooms.has(roomId)) {
        rooms.set(roomId, []);
      }
      const clients = rooms.get(roomId);
      clients.push(ws);
      ws.roomId = roomId;

      if (clients.length === 2) {
        clients.forEach((client, index) => {
          client.send(JSON.stringify({ type: 'start', playerId: index }));
        });
      }
    } else if (data.type === 'offer' || data.type === 'answer' || data.type === 'ice') {
      const clients = rooms.get(ws.roomId);
      const otherClient = clients.find((client) => client !== ws);
      if (otherClient) {
        otherClient.send(JSON.stringify(data));
      }
    }
  });

  ws.on('close', () => {
    const clients = rooms.get(ws.roomId);
    if (clients) {
      rooms.set(ws.roomId, clients.filter((client) => client !== ws));
      if (rooms.get(ws.roomId).length === 0) {
        rooms.delete(ws.roomId);
      }
    }
  });
});

console.log('Servidor rodando...');