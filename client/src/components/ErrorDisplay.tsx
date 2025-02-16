import { Card, CardContent } from "@/components/ui/card";
import type { ErrorMetricsType } from '@shared/schema';
import { Activity, Clock } from "lucide-react";

interface ErrorDisplayProps {
  error: ErrorMetricsType | null;
}

export default function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (!error) {
    return (
      <div className="text-center p-8 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-100 shadow-lg">
        <Activity className="h-12 w-12 mx-auto mb-3 text-primary animate-pulse" />
        <p className="text-gray-500 font-medium">Waiting for tracking data...</p>
      </div>
    );
  }

  const errorValue = Number(error.error);
  const timestamp = new Date(error.timestamp);
  const isValidError = !isNaN(errorValue) && !isNaN(timestamp.getTime());

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-100 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">
                  Tracking Accuracy
                </span>
              </div>
              <div className="text-4xl font-bold text-primary">
                {isValidError ? `${errorValue.toFixed(2)}px` : 'Invalid'}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500 font-medium">Last Update</span>
              </div>
              <span className="font-semibold text-gray-700">
                {isValidError ? timestamp.toLocaleTimeString() : 'Unknown'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}