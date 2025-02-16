import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import { EventEmitter } from 'events';
import type { BallCoordinatesType, ErrorMetricsType } from '@shared/schema';

export function setupWebTransport(httpServer: Server) {
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });

  const eventEmitter = new EventEmitter();
  const clients = new Set<WebSocket>();
  let lastBallPosition = { x: 0, y: 0, timestamp: Date.now() };
  let lastReceivedCoordinates = { x: 0, y: 0, timestamp: 0 };

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    clients.add(ws);

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'webrtc-offer') {
          // Emit WebRTC offer event with response callback
          eventEmitter.emit('webrtc-offer', data.payload, (response: any) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(response));
            }
          });
        } else if (data.type === 'coordinates') {
          lastReceivedCoordinates = data.payload;
          handleCoordinates(data.payload);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    });
  });

  function computeAndSendError(predicted: BallCoordinatesType, actual: BallCoordinatesType) {
    const dx = predicted.x - actual.x;
    const dy = predicted.y - actual.y;
    const errorValue = Math.sqrt(dx * dx + dy * dy);

    const errorMetrics: ErrorMetricsType = {
      error: Number(errorValue.toFixed(2)),
      timestamp: Date.now()
    };

    const message = JSON.stringify({
      type: 'error',
      payload: errorMetrics
    });

    Array.from(clients).forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  function handleCoordinates(coordinates: BallCoordinatesType) {
    computeAndSendError(coordinates, lastBallPosition);
  }

  function updateBallPosition(position: BallCoordinatesType) {
    lastBallPosition = position;
    const timeDiff = position.timestamp - lastReceivedCoordinates.timestamp;
    if (timeDiff < 100) {
      computeAndSendError(lastReceivedCoordinates, position);
    }
    const message = JSON.stringify({ type: 'ballPosition', payload: position });
    Array.from(clients).forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  return {
    handleCoordinates,
    updateBallPosition,
    on: eventEmitter.on.bind(eventEmitter),
    cleanup: async () => {
      Array.from(clients).forEach(client => {
        client.close();
      });
      wss.close();
    }
  };
}