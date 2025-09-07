function setupWebSocketHandler(wss) {
  wss.on('connection', function connection(ws) {
    console.log('New WebSocket connection established');

    ws.on('message', async function incoming(message) {
      try {
        const data = JSON.parse(message);
        
        // 處理成員更新
        if (data.type === 'member_update') {
          // 廣播給所有連接的客戶端
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'member_update',
                groupId: data.groupId,
                members: data.members
              }));
            }
          });
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
}

module.exports = setupWebSocketHandler;