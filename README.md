# Mini Order & Inventory API

A backend service for a small e-commerce operation managing products, users, and orders with MongoDB transactional guarantees.

## Stack

- **Runtime:** Node.js 22
- **Framework:** Express 5
- **Database:** MongoDB 7 (replica set for transactions)
- **ODM:** Mongoose 9
- **Validation:** Zod
- **Auth:** JWT + bcryptjs
- **Testing:** Jest + supertest + mongodb-memory-server

## Setup & Run

### Option 1: Docker (recommended)

```bash
cp .env.example .env
docker compose up --build
```

The app will be available at `http://localhost:3000`.

### Option 2: Local development

Prerequisites: Node.js 22+, MongoDB 7+ running as a replica set.

```bash
cp .env.example .env
npm install
npm run dev
```

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | MongoDB connection string | (required) |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars) | (required) |
| `JWT_EXPIRES_IN` | JWT expiration | `7d` |
| `CORS_ORIGIN` | Allowed CORS origin | `*` |
| `PORT` | Server port | `3000` |

### Running Tests

```bash
npm test
```

Tests use `mongodb-memory-server` in replica set mode — no external MongoDB required.

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

### Role Enforcement via Middleware

Roles are enforced at the route level using `authorize('admin')` middleware — never in controllers. This ensures:
- Separation of concerns (authorization logic is decoupled from business logic)
- Impossible to accidentally serve an admin endpoint without the middleware
- Easy to audit which endpoints require which roles

### Input Validation with Zod

All request bodies are validated through Zod schemas in a `validate` middleware before reaching any controller. This provides:
- Consistent validation with detailed error messages
- Type safety (parsed output is correctly typed)
- Protection against NoSQL injection (all input is typed and validated before use in queries)

## API Documentation

### Auth

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/api/v1/auth/signup` | No | `{ name, email, password }` | Register new user |
| POST | `/api/v1/auth/login` | No | `{ email, password }` | Login, returns JWT |

### Products

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/v1/products` | Yes | Any | List products (pagination: `page`, `limit`; filter: `category`) |
| GET | `/api/v1/products/:id` | Yes | Any | Get single product |
| POST | `/api/v1/products` | Yes | Admin | Create product (`name`, `price`, `stock`, `category`) |
| PATCH | `/api/v1/products/:id` | Yes | Admin | Update product (partial) |
| DELETE | `/api/v1/products/:id` | Yes | Admin | Delete product |

### Orders

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/api/v1/orders` | Yes | Customer/Admin | Place order (`items: [{ product, quantity }]`) |
| GET | `/api/v1/orders` | Yes | Any | List orders (pagination: `page`, `limit`; filter: `status`; customers see own only, admins see all) |

### Error Response Format

All errors follow this structure:

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
