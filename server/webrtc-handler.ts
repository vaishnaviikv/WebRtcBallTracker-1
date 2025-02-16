
import { RTCPeerConnection, MediaStream, nonstandard } from 'wrtc';
import type { Server } from 'http';
import type { Worker } from 'worker_threads';
import { createBallWorker } from './ball-worker';
import type { BallConfigType } from '@shared/schema';

export function setupWebRTC(httpServer: Server) {
  const peerConnections = new Set<RTCPeerConnection>();
  const videoSources = new Map<wrtc.RTCPeerConnection, any>();
  const workers = new Map<wrtc.RTCPeerConnection, Worker>();

  return {
    handleOffer: async (offer: RTCSessionDescriptionInit, config: { frameRate: number }) => {
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      peerConnections.add(peerConnection);

      // Create video stream
      const videoSource = new wrtc.nonstandard.RTCVideoSource({
        h264: true,
        degradationPreference: 'maintain-framerate'
      });
      const videoTrack = videoSource.createTrack();
      const stream = new wrtc.MediaStream();
      stream.addTrack(videoTrack);

      videoSources.set(peerConnection, videoSource);

      // Create ball worker with configured frame rate
      const ballConfig: BallConfigType = {
        frameRate: config.frameRate,
        width: 640,
        height: 480,
        ballRadius: 20
      };

      const ballWorker = createBallWorker(ballConfig);
      workers.set(peerConnection, ballWorker);

      // Handle ball animation frames
      ballWorker.on('message', (frame) => {
        const { width, height } = ballConfig;
        const data = new Uint8ClampedArray(width * height * 4);

        // Create a frame with a red ball
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const dx = x - frame.x;
            const dy = y - frame.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < ballConfig.ballRadius) {
              data[i] = 255;     // Red
              data[i + 1] = 0;   // Green
              data[i + 2] = 0;   // Blue
              data[i + 3] = 255; // Alpha
            } else {
              data[i] = 255;     // White background
              data[i + 1] = 255;
              data[i + 2] = 255;
              data[i + 3] = 255;
            }
          }
        }

        videoSource.onFrame({
          width,
          height,
          data
        });
      });

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      return answer;
    },

    cleanup: async () => {
      for (const [pc, worker] of workers.entries()) {
        worker.terminate();
        workers.delete(pc);
      }

      for (const [pc, videoSource] of videoSources.entries()) {
        videoSource.close();
        videoSources.delete(pc);
      }

      for (const pc of peerConnections) {
        pc.close();
        peerConnections.delete(pc);
      }
    }
  };
}
