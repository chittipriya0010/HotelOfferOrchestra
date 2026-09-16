import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runWorker() {
  // 1. Establish the Native Connection using the IPv4 address
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_URL || '127.0.0.1:7233',
  });

  // 2. Pass the connection instance into the Worker
  const worker = await Worker.create({
    connection,
    workflowsPath: path.join(__dirname, 'workflows.ts'),
    activities,
    taskQueue: 'hotel-offers',
  });

  console.log('[Temporal] Worker started executing successfully.');
  await worker.run();
}