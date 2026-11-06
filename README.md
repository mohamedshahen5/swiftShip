# SwiftShip — Team Integration Foundation

This is a development foundation based on the uploaded `swiftShip-main.zip`, **not a completed courier/admin UI**. The shared routes, role restrictions, schema changes, seed data and working core handlers are included. Member 3 implements courier controls and expanded shipment details; member 4 implements the admin UI and validated edit/delete policies. Admin edit/delete deliberately return HTTP **501** until they are safely implemented.

## 0. Prerequisites
- Go **1.27.3** (the version in `backend/go.mod`; or update dependencies and `go.mod` consistently with your installed Go version)
- Node.js 22+, npm and an Angular 19 compatible setup
- MySQL 8.x; local host `127.0.0.1:3306`
- **Never run seed data on production.** It uses public development-only credentials.

## 1. Back up and integrate
1. Back up your original project and MySQL database before applying SQL.
2. Extract the ZIP as a separate project. Do **not** copy it on top of uncommitted work.
3. Create a Git branch for the foundation, e.g. `git checkout -b foundation/roles-shipment-contract` and commit files in this extracted folder.
4. If sharing an existing database previously patched manually, inspect `SHOW COLUMNS FROM users;`, `SHOW COLUMNS FROM shipments;` and `SHOW COLUMNS FROM shipment_history;`. **Do not rerun 004/005 if their columns already exist**. Reconcile manually if only some columns exist.

## 2. Create the local MySQL database
In a MySQL client run:

```sql
CREATE DATABASE IF NOT EXISTS swiftship CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'swiftship'@'localhost' IDENTIFIED BY 'choose-a-password';
GRANT ALL PRIVILEGES ON swiftship.* TO 'swiftship'@'localhost';
```

For a NEW empty database only, from your project root run **in order** (PowerShell or bash examples using mysql):

```bash
mysql -u swiftship -p swiftship < backend/migrations/001_create_users.sql
mysql -u swiftship -p swiftship < backend/migrations/002_create_shipments.sql
mysql -u swiftship -p swiftship < backend/migrations/003_create_shipment_history.sql
mysql -u swiftship -p swiftship < backend/migrations/004_roles_pickup_delivery.sql
mysql -u swiftship -p swiftship < backend/migrations/005_accepted_history.sql
mysql -u swiftship -p swiftship < backend/seed_dev_data.sql
```

The `<` redirection works in **cmd.exe** and bash; in PowerShell use `cmd /c "mysql -u swiftship -p swiftship < backend/migrations/001_create_users.sql"` for each file, or paste SQL into MySQL Workbench. Do not run the first three against an existing populated database unless you have verified their state. MySQL DDL is not fully transactional.

### Development accounts (seed)
All use **SwiftShip#2026** — change/delete these outside isolated local development:

| Role | Email |
|---|---|
| admin | admin@swiftship.test |
| courier | courier1@swiftship.test |
| courier | courier2@swiftship.test |
| customer | customer1@swiftship.test |
| customer | customer2@swiftship.test |

8 sample shipments have tracking numbers `SWIFT-DEV-001` through `SWIFT-DEV-008` and span all statuses.

## 3. Start backend
From the `backend` folder, **set environment variables in your terminal**, because `.env.example` is documentation, not automatically loaded:

macOS/Linux (bash):
```bash
export DB_DSN='swiftship:choose-a-password@tcp(127.0.0.1:3306)/swiftship?parseTime=true'
export JWT_SECRET='use-a-long-unique-random-secret-at-least-32-characters'
go mod download
go test ./...
go run .
```

Windows PowerShell:
```powershell
$env:DB_DSN='swiftship:choose-a-password@tcp(127.0.0.1:3306)/swiftship?parseTime=true'
$env:JWT_SECRET='use-a-long-unique-random-secret-at-least-32-characters'
go mod download
go test ./...
go run .
```

Check http://localhost:8080/api/health — should return a running message. Passwords containing special DSN characters may need escaping.

## 4. Start frontend
Open **another terminal** in `frontend`:

```bash
npm ci
npm run build
npm start
```

Open http://localhost:4200/login and sign in with a seeded account. If backend hostname changes, edit `frontend/src/app/environments/environment.ts`.

## 5. Test API status lifecycle
Use Postman/Insomnia or curl. Log in with `POST /api/auth/login` and JSON `{ "email": "admin@swiftship.test", "password": "SwiftShip#2026" }`; copy the returned token into `Authorization: Bearer TOKEN`.

- `GET /api/admin/shipments` — admin only; `GET /api/admin/couriers` — admin only
- `PATCH /api/admin/shipments/1/assign` body `{ "courier_id": 2 }` — admin only, on a pending/assigned/accepted shipment (use actual IDs from `/couriers`)
- Login as the assigned courier, `GET /api/courier/shipments`, then `POST /api/courier/shipments/1/accept` (only from `assigned`)
- `PATCH /api/courier/shipments/1/status` body `{ "status": "picked_up", "notes": "Collected" }`, then `in_transit`, then `delivered`
- Customer `POST /api/shipments/1/cancel` only when **own** shipment is pending
- `GET /api/shipments/1` only for owner, assigned courier, or admin
- Test that an unrelated courier cannot view or edit another courier's shipment; response must be 403.

For a seed dataset, IDs may not match examples: get actual IDs from listing responses. Do not expect to `accept` a delivered fixture.

## 6. Team merge order
1. Push only the new foundation branch; members 1 and 2 review the schema, JWT role and existing customer flow.
2. Merge foundation into `main`. **Members 3 and 4 branch afresh from that exact merge commit.**
3. Member 3 edits `backend/routes/courier_routes.go`, `backend/handlers/courier_handler.go`, `frontend/src/app/services/courier.service.ts`, `frontend/src/app/pages/courier-assigned/`, and `frontend/src/app/pages/shipment-details/`.
4. Member 4 edits `backend/routes/admin_routes.go`, `backend/handlers/admin_handler.go`, `frontend/src/app/services/admin.service.ts`, `frontend/src/app/pages/admin-orders/`.
5. Members 3/4 should **not edit** `main.go`, shared shipment contracts, or earlier SQL migrations. New schema changes use migration `006` (member 3) and `007` (member 4), coordinated in sequence.
6. After each feature PR: run `go test ./...`, `npm run build`, and manual role/ownership tests.

## Known limits and safeguards
- Backend Go test/compile and Angular build were **not executable in the packaging environment** without downloading the original Go toolchain and npm dependencies. Run the commands above locally before merging.
- Customer cancellation, courier accept/decline/status, admin assign/reassign, and lists are implemented. Details pages and list pages are deliberately minimal starter UIs.
- Admin edit/delete endpoints return HTTP **501** by design; member 4 must implement safe rules, ideally a soft-delete strategy rather than deleting shipments and history.
- Shared query returns nested `customer` and `courier` (or null), nullable pickup and delivery times, and every status. API date fields are strings.
- Existing public tracking/history endpoints are retained; consider minimizing personally identifiable details exposed through public tracking.
- JWT role is signed at login; a role change requires re-login to refresh the token. For production, consider a database-backed authorization check or role versioning.
- Keep a backup before running migrations, never commit real DSN/passwords, and replace the seed accounts before deployment.
