import { Connection, Client } from '@temporalio/client';

let client: Client;

export async function getTemporalClient() {
  if (!client) {
    // FIX: Use 127.0.0.1 instead of localhost
    const connection = await Connection.connect({ address: process.env.TEMPORAL_URL || '127.0.0.1:7233' });
    client = new Client({ connection });
  }
  return client;
}