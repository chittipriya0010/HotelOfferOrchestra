import { Router } from 'express';
import { getTemporalClient } from '../temporal/client.js';
import { getFilteredFromRedis } from '../redis/hotel.repository.js';
import { hotelOfferWorkflow } from '../temporal/workflows.js';

const router = Router();

router.get('/hotels', async (req, res) => {
  try {
    const city = (req.query.city as string)?.toLowerCase();
    if (!city) return res.status(400).json({ error: "Missing 'city' query parameter." });

    const minPrice = req.query.minPrice as string;
    const maxPrice = req.query.maxPrice as string;

    // 1. ORCHESTRATE: Always run the Temporal Workflow.
    // This fetches in parallel, dedupes, selects the cheapest, and SAVES to Redis.
    const client = await getTemporalClient();
    const handle = await client.workflow.start(hotelOfferWorkflow, {
      args: [city],
      taskQueue: 'hotel-offers',
      workflowId: `hotel-wf-${city}-${Date.now()}`
    });

    const deduplicatedHotels = await handle.result();

    // 2. ROUTE BEHAVIOR
    if (minPrice || maxPrice) {
      // API REQUIREMENT 2: If filters exist, query Redis natively for the price range
      const min = minPrice ? String(minPrice) : '-inf';
      const max = maxPrice ? String(maxPrice) : '+inf';
      
      const filteredHotels = await getFilteredFromRedis(city, min, max);
      return res.json(filteredHotels);
    } else {
      // API REQUIREMENT 1: No filters, just return the deduplicated list directly
      return res.json(deduplicatedHotels);
    }

  } catch (error) {
    console.error('[API Error]', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;