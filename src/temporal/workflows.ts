import { proxyActivities, log } from '@temporalio/workflow';
import type * as activities from './activities.js';
import type { Hotel } from '../types/hotel.js';

const { fetchSupplierA, fetchSupplierB, saveHotelsToRedis } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 seconds',
  retry: {
    initialInterval: '1 second',
    maximumAttempts: 3,
  },
});

export async function hotelOfferWorkflow(city: string): Promise<Hotel[]> {
  log.info('Starting hotel offer workflow', { city });

  const [listA, listB] = await Promise.all([
    fetchSupplierA(city),
    fetchSupplierB(city)
  ]);

  log.info('Fetched supplier results', {
    city,
    supplierACount: listA.length,
    supplierBCount: listB.length,
  });

  const merged = new Map<string, Hotel>();

  [...listA, ...listB].forEach(hotel => {
    const existing = merged.get(hotel.name);
    if (!existing || hotel.price < existing.price) {
      merged.set(hotel.name, hotel);
    }
  });

  const finalHotels = Array.from(merged.values());

  try {
    await saveHotelsToRedis(city, finalHotels);
  } catch (err) {
    log.error('Failed to save hotels to Redis', { city, error: String(err) });
    throw err;
  }

  log.info('Workflow completed', { city, resultCount: finalHotels.length });
  return finalHotels;
}