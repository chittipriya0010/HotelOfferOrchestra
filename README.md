# Hotel Offer Orchestrator

Aggregates overlapping hotel offers from two mock suppliers, de-duplicates hotels by name (keeping
the cheaper offer per hotel), and returns the best-priced list per city. Supports filtering the
result by price range, with the filtering done natively inside Redis. Orchestration (parallel
supplier calls, dedupe, persistence) is handled by a Temporal workflow.

## Stack

- Node.js (TypeScript), Express
- Temporal.io (workflow orchestration)
- Redis (sorted-set storage + native price-range filtering)
- Docker Compose

## Architecture

```
Client
  │
  ▼
GET /api/hotels?city=delhi[&minPrice=&maxPrice=]
  │
  ▼
Temporal Workflow (hotelOfferWorkflow)
  ├── Activity: fetchSupplierA(city)  ─┐
  ├── Activity: fetchSupplierB(city)  ─┤  (run in parallel)
  │                                     │
  ├── Dedupe by hotel name, keep cheaper price
  ├── Activity: saveHotelsToRedis(city, hotels)  → Redis sorted set, score = price
  │
  ▼
If minPrice/maxPrice given → ZRANGE BY SCORE in Redis
Else                       → return the deduped list directly
```

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Compose v2, bundled with Docker Desktop)
- Node.js 20+ and npm (only needed if you want to run outside Docker)

## Project structure

```
src/
  api/
    app.ts            # Express app bootstrap
    route.ts           # GET /api/hotels
    health.routes.ts   # GET /health
  suppliers/
    supplier.routes.ts # Mock GET /supplierA/hotels, GET /supplierB/hotels
  temporal/
    client.ts          # Temporal Client (used by the API to start workflows)
    worker.ts           # Temporal Worker (runs the workflow + activities)
    workflows.ts        # hotelOfferWorkflow: fetch, dedupe, save
    activities.ts        # fetchSupplierA/B, saveHotelsToRedis
  redis/
    hotel.repository.ts # Redis sorted-set read/write + range filtering
  types/
    hotel.ts             # Hotel type
  index.ts                # Wires Redis + Express + Temporal Worker together
docker-compose.yaml
Dockerfile
```

## Running everything with Docker (recommended)

This starts Redis, a local Temporal dev server (with Web UI), and the app itself — all wired
together automatically.

```bash
docker-compose up -d --build
```

Check everything is up:

```bash
docker ps -a
```

You should see three healthy/`Up` containers: `..._redis_1`, `..._temporal_1`, `..._app_1`.

- API: http://localhost:3000
- Temporal Web UI: http://localhost:8233
- Redis: localhost:6379

To stop everything:

```bash
docker-compose down
```

## Running locally without Docker (for development)

1. Start only the infra containers:
   ```bash
   docker-compose up -d redis temporal
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Make sure `.env` points at `127.0.0.1` (this is already the default in `.env`):
   ```
   PORT=3000
   API_URL=http://127.0.0.1:3000
   REDIS_URL=redis://127.0.0.1:6379
   TEMPORAL_URL=127.0.0.1:7233
   ```
4. Start the app (this runs both the Express server and the Temporal worker in one process):
   ```bash
   npm run dev
   ```

## API Reference

### `GET /api/hotels?city=<city>`

Runs the Temporal workflow: fetches both suppliers in parallel, de-dupes by hotel name (keeping
the cheaper price, or the only available offer if just one supplier has it), saves the result to
Redis, and returns it.

```bash
curl "http://localhost:3000/api/hotels?city=delhi"
```

```json
[
  { "hotelId": "b1", "name": "Holtin", "price": 5340, "city": "delhi", "commissionPct": 20, "supplier": "Supplier B" },
  { "hotelId": "a2", "name": "Radisson", "price": 5900, "city": "delhi", "commissionPct": 13, "supplier": "Supplier A" },
  { "hotelId": "b2", "name": "Taj", "price": 8000, "city": "delhi", "commissionPct": 15, "supplier": "Supplier B" }
]
```

### `GET /api/hotels?city=<city>&minPrice=<min>&maxPrice=<max>`

Same as above, but instead of returning the full deduped list, filters it by price range using a
native Redis `ZRANGE ... BY SCORE` query against the sorted set the workflow just saved.

```bash
curl "http://localhost:3000/api/hotels?city=delhi&minPrice=5000&maxPrice=6000"
```

### `GET /supplierA/hotels?city=<city>` / `GET /supplierB/hotels?city=<city>`

Mock supplier endpoints. Currently return static data for `city=delhi` and an empty array for any
other city.

### `GET /health`

Reports app status plus the reachability of both mock suppliers.

```bash
curl "http://localhost:3000/health"
```

```json
{ "status": "ok", "suppliers": { "supplierA": "healthy", "supplierB": "healthy" } }
```

## Postman Collection

Import [`HotelOfferOrchestrator.postman_collection.json`](./HotelOfferOrchestrator.postman_collection.json)
into Postman. It includes:

- Valid city with overlapping suppliers (`city=delhi`)
- City with no results (`city=mumbai`)
- Price-range filter (`city=delhi&minPrice=5000&maxPrice=6000`)
- Health check
- A note on manually simulating a supplier outage (stop the `app` container's outbound access to
  itself, or temporarily comment out one supplier route and restart, then re-hit `/health` and
  `/api/hotels` to see the workflow/activity still return the other supplier's results)

## Notes on design decisions

- The dedupe/selection logic lives entirely inside the Temporal workflow (`hotelOfferWorkflow`),
  so it's replayable and durable — if the worker crashes mid-run, Temporal resumes it.
- Activities retry up to 3 times on failure (`retry.maximumAttempts: 3` in `workflows.ts`) and log
  via Temporal's workflow logger; supplier fetch activities also fail gracefully (return `[]`
  instead of throwing) so one supplier being down doesn't take down the whole request.
- Redis stores each city's hotel list as a sorted set (`hotels:<city>`), scored by price, with a
  1-hour TTL. This lets price-range filtering happen natively in Redis (`ZRANGE BY SCORE`) instead
  of being filtered in application code.
