import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupWebTransport } from "./webtransport-handler";
import { setupWebRTC } from "./webrtc-handler";
import type { BallConfigType } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize WebRTC handler
  const webrtcHandler = setupWebRTC(httpServer);

  // Initialize WebTransport handler
  const transportHandler = setupWebTransport(httpServer);

  // Handle WebRTC offer coming through WebTransport
  transportHandler.on('webrtc-offer', async (data: any, send: (response: any) => void) => {
    try {
      const { sdp, type, config } = data;
      const answer = await webrtcHandler.handleOffer({ sdp, type }, config);
      send({
        type: 'webrtc-answer',
        payload: answer
      });
    } catch (err) {
      console.error('Failed to handle WebRTC offer:', err);
      send({
        type: 'error',
        payload: 'Failed to process WebRTC offer'
      });
    }
  });

  // Handle coordinate updates
  app.post('/api/coordinates', (req, res) => {
    try {
      transportHandler.handleCoordinates(req.body);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ error: 'Failed to process coordinates' });
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Cleaning up...');
    await transportHandler.cleanup();
    await webrtcHandler.cleanup();
    httpServer.close();
    process.exit(0);
  });

  return httpServer;
}