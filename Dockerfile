# Use a Debian-based image (not alpine) because @temporalio/worker
# ships native Rust bindings that require glibc.
FROM node:20-bookworm-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source
COPY . .

EXPOSE 3000

# Run via tsx, same as the local "npm run dev" script.
# (Temporal's worker bundles workflows.ts itself, so no separate build step is needed.)
CMD ["npx", "tsx", "src/index.ts"]
