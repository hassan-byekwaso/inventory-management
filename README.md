# Stockroom Inventory Management

A responsive React and Express inventory system using MongoDB and Mongoose. It preserves role-based access, transactional stock updates, purchase and sales workflows, stock-movement history, notifications, and PDF/CSV exports.

## Requirements

- Node.js 20 or newer
- MongoDB local installation, MongoDB Community via Docker, or MongoDB Atlas

## Local setup

```powershell
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
npm install
npm run db:seed
npm run dev
```

Set `MONGODB_URI=mongodb://127.0.0.1:27017/inventory_management` in `server/.env` for a local MongoDB instance. MongoDB Atlas is also supported:

```text
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
```

Create a database user and allowlist the API host in Atlas Network Access. For an Atlas replica set or sharded cluster, sales and purchase operations use Mongoose transactions; conditional product updates additionally prevent stock from becoming negative on standalone MongoDB instances.

The web app runs at `http://localhost:5173` and the API at `http://localhost:4000/api`.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@inventory.local` | `Inventory123!` |
| Inventory Manager | `manager@inventory.local` | `Manager123!` |
| Staff | `staff@inventory.local` | `Staff123!` |

Change demo passwords and set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` before production use. The seeder refuses the default Admin password in production.

## Commands

```powershell
npm run dev
npm run build
npm run test
npm run db:seed
npm start
```

## Server environment

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB or MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` | Random secret of at least 32 characters |
| `JWT_ACCESS_TTL` | Access-token lifetime, default `15m` |
| `REFRESH_TOKEN_DAYS` | Refresh-token lifetime, default `14` |
| `CLIENT_ORIGIN` | Comma-separated allowed browser origins |
| `COOKIE_SECURE` | Set `true` behind HTTPS |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Initial Admin credentials |
| `PORT`, `NODE_ENV` | API listen port and runtime environment |

Set `VITE_API_URL` in `client/.env` to the API URL including `/api` when it differs from `http://localhost:4000/api`.

## API

- `POST /api/auth/register`, `/login`, `/refresh`, `/logout`, `GET /api/auth/me`
- `/api/products`, `/api/suppliers`
- `/api/purchases`, `/api/sales`
- `/api/dashboard`, `/api/notifications`
- `/api/reports/{sales|purchases|inventory|profit|low-stock|best-sellers}`
- `/api/users`
- `GET /api/health`

List endpoints return `{ data, pagination: { page, limit, total, pages } }`. Order creation accepts `Idempotency-Key` for retry-safe creation.

## Render and Railway

Create a MongoDB Atlas cluster and copy the Atlas connection string.

### Render

The included `render.yaml` creates the API service. Set `MONGODB_URI`, `JWT_ACCESS_SECRET`, `CLIENT_ORIGIN`, and the optional seed credentials in the dashboard.

- Build: `npm install --include=dev`
- Start: `npm start`
- Health: `/api/health`

### Railway

- Build: `npm install --include=dev`
- Start: `npm start`
- Set `MONGODB_URI` and the server variables listed above.
- Use the exact HTTPS frontend origin for `CLIENT_ORIGIN`.

Run `npm run db:seed` once in a secure deployment shell or one-off job after first deploy.

## Vercel client

Import the repository and set the root directory to the repository root. The included Vercel configuration builds `npm run build` and serves `client/dist`.

Set `VITE_API_URL=https://<api-host>/api`, redeploy, and set that exact origin in the API `CLIENT_ORIGIN`. Enable `COOKIE_SECURE=true` for HTTPS. In cross-site deployments, configure cookies and CORS for your browser origins; same-site hosting or an API proxy avoids third-party-cookie restrictions.
