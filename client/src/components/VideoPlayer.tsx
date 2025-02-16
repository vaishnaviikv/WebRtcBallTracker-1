import { useEffect, useRef, useState, type RefObject } from 'react';
import type { BallCoordinatesType } from '@shared/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { setupWebRTC, calculateBallPosition } from '@/lib/webrtc';
import { setupWebTransport } from '@/lib/webtransport';
import { Slider } from '@/components/ui/slider';

interface VideoPlayerProps {
  canvasRef: RefObject<HTMLCanvasElement>;
}

export default function VideoPlayer({ canvasRef }: VideoPlayerProps) {
  const [coordinates, setCoordinates] = useState<BallCoordinatesType | null>(null);
  const [frameRate, setFrameRate] = useState<number>(30);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rtcPeerRef = useRef<RTCPeerConnection | null>(null);
  const transportRef = useRef<any>(null);
  const processingFrameRef = useRef<boolean>(false);

  // Initialize WebRTC and WebTransport
  useEffect(() => {
    let mounted = true;
    const initializeConnection = async () => {
      try {
        // Initialize WebRTC
        const peerConnection = await setupWebRTC(frameRate);
        if (!mounted) return;

        rtcPeerRef.current = peerConnection;

        // Handle incoming video track
        peerConnection.ontrack = (event) => {
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
          }
        };

        // Initialize WebTransport for coordinate feedback
        const transport = await setupWebTransport();
        if (!mounted) return;

        transportRef.current = transport;
      } catch (err) {
        console.error('Failed to initialize connection:', err);
      }
    };

    initializeConnection();

    return () => {
      mounted = false;
      if (rtcPeerRef.current) {
        rtcPeerRef.current.close();
      }
      if (transportRef.current) {
        transportRef.current.close().catch(console.error);
      }
    };
  }, [frameRate]);

  // Handle frame processing
  useEffect(() => {
    const processFrame = () => {
      if (!videoRef.current || !canvasRef.current || processingFrameRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0);

      // Calculate ball position
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const ballPosition = calculateBallPosition(imageData);

      // Send coordinates via WebTransport
      if (transportRef.current) {
        transportRef.current.send({
          type: 'coordinates',
          payload: {
            x: ballPosition.x,
            y: ballPosition.y,
            timestamp: Date.now()
          }
        }).catch(console.error);
      }

      setCoordinates({
        x: ballPosition.x,
        y: ballPosition.y,
        timestamp: Date.now()
      });

      processingFrameRef.current = false;
    };

    // Process frames at half the incoming frame rate
    const interval = setInterval(() => {
      if (!processingFrameRef.current) {
        processingFrameRef.current = true;
        requestAnimationFrame(processFrame);
      }
    }, 1000 / (frameRate / 2));

    return () => clearInterval(interval);
  }, [canvasRef, frameRate]);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">
            Ball Tracking Visualization
          </h2>
        </div>

        <div className="mb-4">
          <label htmlFor="frameRate" className="text-sm font-medium text-gray-500">
            Frame Rate: {frameRate} fps
          </label>
          <Slider
            id="frameRate"
            value={[frameRate]}
            onValueChange={(value) => setFrameRate(value[0])}
            min={1}
            max={60}
            step={1}
            className="mt-2"
          />
        </div>

        {coordinates && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Ball Position</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-500">X:</span> {coordinates.x}
              </div>
              <div>
                <span className="text-gray-500">Y:</span> {coordinates.y}
              </div>
            </div>
          </div>
        )}

        <div className="relative mb-6">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '640px', height: '480px' }}
            className="rounded-lg border-2 border-gray-100 shadow-inner"
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="absolute top-0 left-0 w-full h-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-100">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-500 mb-1">X Coordinate</div>
              <div className="text-3xl font-bold text-primary">
                {coordinates?.x?.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-100">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-500 mb-1">Y Coordinate</div>
              <div className="text-3xl font-bold text-primary">
                {coordinates?.y?.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}