import axios from 'axios';
import { Router } from 'express';

const router = Router();

// GET /health - reports overall app status and the health of both suppliers
router.get('/health', async (req, res) => {
  const baseUrl = process.env.API_URL || 'http://127.0.0.1:3000';

  const [resA, resB] = await Promise.allSettled([
    axios.get(`${baseUrl}/supplierA/hotels?city=delhi`),
    axios.get(`${baseUrl}/supplierB/hotels?city=delhi`)
  ]);

  const supplierA = resA.status === 'fulfilled' ? 'healthy' : 'down';
  const supplierB = resB.status === 'fulfilled' ? 'healthy' : 'down';

  res.json({
    status: 'ok',
    suppliers: { supplierA, supplierB }
  });
});

export default router;
