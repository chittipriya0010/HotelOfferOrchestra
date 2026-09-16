import { Router } from 'express';

const router = Router();

router.get('/supplierA/hotels', (req, res) => {
  const city = req.query.city as string;
  if (city?.toLowerCase() !== 'delhi') return res.json([]);
  
  res.json([
    { hotelId: "a1", name: "Holtin", price: 6000, city: "delhi", commissionPct: 10, supplier: "Supplier A" },
    { hotelId: "a2", name: "Radisson", price: 5900, city: "delhi", commissionPct: 13, supplier: "Supplier A" }
  ]);
});

router.get('/supplierB/hotels', (req, res) => {
  const city = req.query.city as string;
  if (city?.toLowerCase() !== 'delhi') return res.json([]);

  res.json([
    { hotelId: "b1", name: "Holtin", price: 5340, city: "delhi", commissionPct: 20, supplier: "Supplier B" },
    { hotelId: "b2", name: "Taj", price: 8000, city: "delhi", commissionPct: 15, supplier: "Supplier B" }
  ]);
});

export default router;