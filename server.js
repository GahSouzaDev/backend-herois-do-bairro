const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

const rooms = new Map();

// Manter conexões vivas com ping/pong
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log('Cliente não respondeu ao ping, encerrando conexão');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('connection', (ws) => {
  console.log('Novo cliente conectado');
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Mensagem recebida:', data);

      if (data.type === 'join') {
        const roomId = data.roomId;
        if (!rooms.has(roomId)) {
          rooms.set(roomId, []);
        }
        const clients = rooms.get(roomId);
        clients.push(ws);
        ws.roomId = roomId;
        console.log(`Cliente entrou na sala ${roomId}. Total de clientes: ${clients.length}`);

        if (clients.length === 2) {
          console.log('Dois clientes conectados, enviando mensagem "start"');
          clients.forEach((client, index) => {
            client.send(JSON.stringify({ type: 'start', playerId: index }));
          });
        }
      } else if (data.type === 'offer' || data.type === 'answer' || data.type === 'ice') {
        const clients = rooms.get(ws.roomId);
        const otherClient = clients.find((client) => client !== ws);
        if (otherClient) {
          console.log(`Encaminhando mensagem ${data.type} para outro cliente`);
          otherClient.send(JSON.stringify(data));
        } else {
          console.log('Outro cliente não encontrado na sala');
        }
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`Cliente desconectado. Código: ${code}, Motivo: ${reason}`);
    const clients = rooms.get(ws.roomId);
    if (clients) {
      rooms.set(ws.roomId, clients.filter((client) => client !== ws));
      if (rooms.get(ws.roomId).length === 0) {
        rooms.delete(ws.roomId);
        console.log(`Sala ${ws.roomId} removida (sem clientes)`);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('Erro no WebSocket:', error);
  });
});

console.log('Servidor rodando...');