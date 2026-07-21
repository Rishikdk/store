# Mini Order & Inventory API

A backend service for a small e-commerce operation managing products, users, and orders with MongoDB transactional guarantees.

## Stack

- **Runtime:** Node.js 22
- **Framework:** Express 5
- **Database:** MongoDB 7 (replica set for transactions)
- **ODM:** Mongoose 9
- **Validation:** Zod
- **Auth:** JWT access + refresh tokens (httpOnly cookie) + bcryptjs
- **Logging:** morgan
- **Security:** helmet, cors, express-rate-limit
- **API Docs:** swagger-ui-express + swagger-jsdoc (OpenAPI 3.0)
- **Testing:** Jest + supertest + mongodb-memory-server (replSet)

## Setup & Run

### Prerequisites

- Node.js 22+
- MongoDB 7+ running as a replica set (for transactions)
- Docker (optional, for mongo-express studio)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your MongoDB replica set connection string and JWT secret.

### 3. Start MongoDB replica set

If you already have MongoDB running but not as a replica set:

```bash
docker exec <container_name> mongosh --quiet --eval 'rs.initiate({_id:"rs0", members:[{_id:0, host:"localhost:27017"}]})'
```

### 4. Seed the database

```bash
npm run seed        # creates users + products (skips existing)
npm run seed:reset  # drops seed data then recreates
```

**Seeded users:**

| Role | Email | Password |
|------|-------|----------|
| admin | `admin@example.com` | `Admin@123` |
| customer | `john@example.com` | `Customer@123` |

**Seeded products:** 15 products across 5 categories (Electronics, Furniture, Books, Stationery, Accessories).

### 5. Start the server

```bash
npm run dev
```

Server runs at `http://localhost:3000` with morgan request logging.

### 6. View API documentation

Open **http://localhost:3000/api-docs** in your browser for the interactive Swagger UI with all endpoints, request/response schemas, and try-it-out functionality.

### Docker

```bash
cp .env.example .env
docker compose up --build
```

Wait for `mongo-init` to finish (initializes the replica set), then verify:

```bash
docker compose logs mongo-init
```

The app starts automatically once the replica set is ready. API at `http://localhost:3000`, Swagger docs at `http://localhost:3000/api-docs`.

**Services:**

| Service | Port | Description |
|---------|------|-------------|
| `mongo` | 27017 | MongoDB 7 replica set |
| `mongo-init` | — | One-shot replica set initializer (exits after success) |
| `app` | 3000 | API server |
| `mongo-express` | 8081 | Web GUI (admin/admin) |

**Standalone commands:**

```bash
docker compose up -d mongo mongo-init   # start only MongoDB + replica set init
docker compose up -d --build app         # start/rebuild app only
docker compose down                      # stop all services
docker compose down -v                   # stop all + delete data volume
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run start` | Run compiled build |
| `npm run test` | Run all tests (in-memory replSet, no external DB needed) |
| `npm run typecheck` | Type-check source files |
| `npm run seed` | Seed database (idempotent) |
| `npm run seed:reset` | Drop and re-seed database |
| `npm run studio` | Launch mongo-express web GUI at `http://localhost:8081` |
| `npm run studio:detach` | Launch mongo-express in background |

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | MongoDB connection string (must be replica set for transactions) | (required) |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens (min 32 chars) | (required) |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiration | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | `7d` |
| `CORS_ORIGIN` | Allowed CORS origin | `*` |
| `PORT` | Server port | `3000` |

## Authentication

All protected endpoints require a `Bearer` token in the Authorization header:

```
Authorization: Bearer <accessToken>
```

Login returns the access token in the response body and sets a refresh token as an httpOnly cookie.

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/signup` | Register (`{ name, email, password, role? }`) |
| POST | `/api/v1/auth/login` | Login (`{ email, password }`) |
| POST | `/api/v1/auth/refresh` | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Revoke refresh token |

## API Documentation

### Products

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/v1/products` | Yes | Any | List products |
| GET | `/api/v1/products/:id` | Yes | Any | Get single product |
| POST | `/api/v1/products` | Yes | Admin | Create product |
| PATCH | `/api/v1/products/:id` | Yes | Admin | Update product |
| DELETE | `/api/v1/products/:id` | Yes | Admin | Delete product |

**GET /api/v1/products query params:**

| Param | Default | Description |
|-------|---------|-------------|
| `page` | `1` | Page number |
| `perPage` | `15` | Items per page (max 100) |
| `sort` | `createdAt` | Sort field (`name`, `price`, `stock`, `createdAt`) |
| `order` | `desc` | Sort direction (`asc`, `desc`) |
| `search` | — | Search by name (case-insensitive) |
| `category` | — | Filter by category |

**Response format:**

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "perPage": 15,
    "total": 50,
    "totalPages": 4
  }
}
```

### Orders

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/api/v1/orders` | Yes | Customer/Admin | Place order |
| GET | `/api/v1/orders` | Yes | Any | List orders |

**POST /api/v1/orders body:**

```json
{
  "items": [
    { "product": "<product_id>", "quantity": 2 },
    { "product": "<product_id>", "quantity": 1 }
  ]
}
```

**GET /api/v1/orders query params:** `page`, `perPage`, `sort`, `order`, `status`

- Customers see only their own orders
- Admins see all orders

**Order error responses:**

| Status | Message |
|--------|---------|
| 400 | Insufficient stock or product not found |
| 400 | Validation error (invalid/missing fields) |
| 409 | Transaction conflict (retry) |

### Error Response Format

```json
{
  "status": "error",
  "message": "Descriptive error message",
  "details": []
}
```

### Health Check

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Returns `{ status: "ok", timestamp }` |

## Testing

```bash
npm test
```

Tests use `mongodb-memory-server` in replica set mode — no external MongoDB required.

**33 tests covering:**
- Auth: signup, login, refresh, logout, duplicate email, invalid credentials
- Products: CRUD, pagination, category filter, role-based access
- Orders: creation, multi-item, insufficient stock, non-existent product, invalid quantity, transaction rollback, concurrency race condition, customer isolation, admin visibility, pagination, status filter

## Project Structure

```
src/
  app.ts                    Express app setup
  server.ts                 Entry point
  config/
    env.ts                  Zod-validated environment variables
  database/
    index.ts                Barrel export (connection + all models)
    connection.ts           MongoDB connect/disconnect with retry
    seed.ts                 Database seeding (users + products)
    models/
      User.ts               User schema, bcrypt pre-save hook, indexes
      Product.ts            Product schema, indexes
      Order.ts              Order schema, item subdocument, compound indexes
      RefreshToken.ts       Refresh token schema, TTL index
  controllers/
    authController.ts       Signup, login, refresh, logout
    productController.ts    Product CRUD + paginated listing
    orderController.ts      Order creation + listing
  services/
    orderService.ts         Transactional order creation with stock guard
  middleware/
    auth.ts                 JWT authenticate + role authorize
    validate.ts             Zod schema validation middleware
  routes/
    auth.ts                 Auth endpoints
    products.ts             Product endpoints
    orders.ts               Order endpoints
  utils/
    AppError.ts             Custom error class
    errorHandler.ts         Central error handler + notFound
    token.ts                JWT access/refresh token utilities
    pagination.ts           Shared pagination schema + helpers
test/
  helpers/
    app.ts                  Test Express app factory
    db.ts                   MongoMemoryReplSet setup/teardown
    env.ts                  Test environment variables
    users.ts                Test user helper
    products.ts             Test product helper
  auth.test.ts
  products.test.ts
  orders.test.ts
```

## Design Decisions

### Stock Race Condition — MongoDB Transactions

**The problem:** When a customer places an order with multiple items, we must decrement stock for every product atomically. If product A's stock is decremented but product B has insufficient stock, we must roll back A's decrement. Concurrent orders for the same product must never oversell.

**Approach:** Multi-document ACID transactions via Mongoose sessions.

1. A transaction session is opened.
2. Each product's stock is decremented using `findOneAndUpdate` with a conditional filter `{ stock: { $gte: quantity } }`. The `$gte` filter prevents overselling — if stock is less than requested, the update matches zero documents and returns null.
3. If any product update fails (returns null), the transaction is aborted, rolling back all previous stock decrements.
4. The order document is created within the same transaction, ensuring all-or-nothing consistency.

**Why transactions over standalone atomic updates:** A standalone `findOneAndUpdate` is atomic for a single document, but with multiple items in one order, partial success is possible — stock for item 1 could be decremented while item 2 fails, leaving data inconsistent. Transactions provide multi-document atomicity that ensures either the entire order succeeds or nothing changes.

**Why `findOneAndUpdate` with `$gte` inside the transaction (not just checking and updating):** Even inside a transaction, a plain read-then-write approach has a window for races. The conditional `$gte` filter on the update itself makes the check-and-decrement atomic at the document level, preventing concurrent transactions from both reading stock=2 and each decrementing to 1 (which would oversell). The combination of conditional updates + transactions gives us both single-document and cross-document safety.
