import { startApp } from './api/app.js';
import { runWorker } from './temporal/worker.js';
import { connectRedis } from './redis/hotel.repository.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  await connectRedis();
  await startApp();
  await runWorker();
}

main().catch(err => {
  console.error('[System Fatal Error]', err);
  process.exit(1);
});