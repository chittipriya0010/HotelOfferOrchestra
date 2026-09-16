import express from 'express';
import supplierRoutes from '../suppliers/supplier.routes.js';
import apiRoutes from './route.js';
import healthRoutes from './health.routes.js';

export async function startApp() {
  const app = express();
  app.use(express.json());

  // Mount the mock suppliers
  app.use('/', supplierRoutes);
  // Health check lives at root: GET /health
  app.use('/', healthRoutes);
  app.use('/api', apiRoutes);

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`[Express] Server running on port ${port}`);
  });
}