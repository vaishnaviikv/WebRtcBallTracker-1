import { Worker } from 'worker_threads';
import type { BallConfigType } from '@shared/schema';

function createWorkerCode(config: BallConfigType) {
  return `
    const config = ${JSON.stringify(config)};
    let x = config.width / 2;
    let y = config.height / 2;
    let dx = 5;
    let dy = 5;

    function updateBallPosition() {
      // Update ball position
      x += dx;
      y += dy;

      // Bounce off walls
      if (x <= config.ballRadius || x >= config.width - config.ballRadius) {
        dx = -dx;
      }
      if (y <= config.ballRadius || y >= config.height - config.ballRadius) {
        dy = -dy;
      }

      // Keep ball within bounds
      x = Math.max(config.ballRadius, Math.min(x, config.width - config.ballRadius));
      y = Math.max(config.ballRadius, Math.min(y, config.height - config.ballRadius));

      // Send frame data to parent
      if (parentPort) {
        parentPort.postMessage({
          x: Math.round(x),
          y: Math.round(y),
          timestamp: Date.now()
        });
      }
    }

    setInterval(updateBallPosition, 1000 / config.frameRate);
  `;
}

export function createBallWorker(config: BallConfigType): Worker {
  const workerCode = createWorkerCode(config);
  const workerData = {
    code: workerCode,
    config
  };

  const worker = new Worker(
    `
    const { parentPort, workerData } = require('worker_threads');
    const { code } = workerData;
    eval(code);
    `,
    {
      eval: true,
      workerData
    }
  );

  return worker;
}