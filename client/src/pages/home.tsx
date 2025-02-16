import { useEffect, useRef, useState } from 'react';
import VideoPlayer from '@/components/VideoPlayer';
import ErrorDisplay from '@/components/ErrorDisplay';
import { setupWebTransport } from '@/lib/webtransport';
import type { ErrorMetricsType } from '@shared/schema';
import { AlertCircle } from 'lucide-react';

export default function Home() {
  const [error, setError] = useState<ErrorMetricsType | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const initConnection = async () => {
      try {
        setConnectionStatus('connecting');
        const transport = await setupWebTransport();

        setConnectionStatus('connected');

        transport.onMessage((message: string) => {
          try {
            const errorMetrics = JSON.parse(message) as ErrorMetricsType;
            setError(errorMetrics);
          } catch (err) {
            console.error('Failed to parse error metrics:', err);
          }
        });

      } catch (err) {
        console.error('Failed to initialize connection:', err);
        setConnectionStatus('error');
      }
    };

    initConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent mb-2">
            Real-Time Ball Tracking
          </h1>
          <p className="text-lg text-gray-600">
            Monitor ball movement and tracking accuracy in real-time
          </p>
        </div>

        {connectionStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-2 shadow-sm">
            <AlertCircle className="h-5 w-5" />
            <span>Connection error. Please refresh the page to try again.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <VideoPlayer canvasRef={canvasRef} />
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent mb-6">
                Tracking Metrics
              </h2>
              <ErrorDisplay error={error} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}