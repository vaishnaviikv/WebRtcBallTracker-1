interface WebTransportInterface {
  send: (data: unknown) => Promise<void>;
  onMessage: (callback: (message: string) => void) => void;
  close: () => Promise<void>;
}

export async function setupWebTransport(): Promise<WebTransportInterface> {
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    // Wait for connection to be established
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        console.log('WebTransport WebSocket connection established');
        resolve(true);
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        console.error('WebTransport WebSocket error:', error);
        reject(error);
      };
    });

    // Handle reconnection
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;

    ws.onclose = () => {
      console.log('WebTransport WebSocket connection closed');
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
        setTimeout(() => setupWebTransport(), 1000 * reconnectAttempts);
      }
    };

    return {
      send: async (data: unknown) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(data));
        } else {
          console.warn('WebSocket not ready, message not sent');
        }
      },
      onMessage: (callback: (message: string) => void) => {
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'error' && data.payload) {
              const { error, timestamp } = data.payload;

              // Ensure we have valid numeric error and timestamp
              if (typeof error === 'number' && typeof timestamp === 'number') {
                callback(JSON.stringify({
                  error: Number(error.toFixed(2)),
                  timestamp: timestamp
                }));
              } else {
                console.error('Invalid error metrics received:', data.payload);
              }
            } else {
              callback(event.data);
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };
      },
      close: async () => {
        ws.close();
      }
    };
  } catch (err) {
    console.error('WebSocket setup failed:', err);
    throw err;
  }
}