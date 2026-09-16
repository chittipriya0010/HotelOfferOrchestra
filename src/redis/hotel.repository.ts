import { createClient } from 'redis';
import type { Hotel } from '../types/hotel.js';

const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.on('error', (err) => console.error('[Redis] Error:', err));

export const connectRedis = async () => {
  if (!redis.isOpen) await redis.connect();
};

export const saveToRedis = async (city: string, hotels: Hotel[]) => {
  const key = `hotels:${city.toLowerCase()}`;
  await redis.del(key); 
  
  if (hotels.length === 0) return;

  const entries = hotels.map(h => ({ score: h.price, value: JSON.stringify(h) }));
  await redis.zAdd(key, entries);
  await redis.expire(key, 3600); 
};

export const getFilteredFromRedis = async (city: string, min: string, max: string): Promise<Hotel[]> => {
  const key = `hotels:${city.toLowerCase()}`;
  const results = await redis.zRange(key, min, max, { BY: 'SCORE' });
  return results.map(r => JSON.parse(r));
};