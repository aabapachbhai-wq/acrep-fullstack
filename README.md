# ACREP — AI-Powered Community Resource Exchange (prototype)

`backend/` Express + MySQL API · `frontend/` React + TypeScript + Vite + Tailwind.

## Setup
Requirements: Node 18+, MySQL 8+.
```bash
# 1. Database (creates DB `acrep` and tables; safe to re-run)
mysql -u root -p < backend/sql/schema.sql

# 2. Backend
cd backend && cp .env.example .env     # edit JWT_SECRET and DB_* values
npm install
npm run seed                           # optional demo data (all flagged is_demo)
npm run dev                            # http://localhost:5000  (health: /api/health)
npm test                               # unit tests for the core logic (no DB needed)

# 3. Frontend (new terminal)
cd frontend && cp .env.example .env
npm install && npm run dev             # http://localhost:5173
```
Demo logins after seeding (password = `DEMO_PASSWORD`, default `Demo@12345`): `owner1@acrep.demo` (Owner), `borrower1@acrep.demo` (Borrower), `owner2@acrep.demo` (Both), `admin@acrep.demo` (Admin).
Seed data uses approximate Pune neighbourhood coordinates and is labelled “Demo data” in the UI.

**Existing project:** this was written without access to your existing repo/schema. `schema.sql` uses `CREATE TABLE IF NOT EXISTS` with snake_case columns. If your tables differ (e.g. `Resource_Name`, `Price_Per_Hour`), SQL lives only in `backend/src/routes/*.js` and `lib/sql.js` and can be adapted — share the schema to align it.

## What is real vs simulated
- **Real:** auth (bcryptjs + JWT), roles, resource CRUD, search/filter/sort, haversine distance, bookings with row-locked overlap checks, server-side pricing, notifications, reviews, favourites, reports/moderation, analytics from stored data, Leaflet/OSM map.
- **Simulated:** payments (`services/payment.js`, labelled everywhere; no card data). Cash stays `Pending`.
- **Optional AI:** set `AI_BASE_URL/AI_API_KEY/AI_MODEL` (OpenAI-compatible) to parse natural-language queries. Ranking itself is always the local scoring engine; the UI shows which engine ran.
- **Not live tracking:** the map polls availability every 30 s. Nothing tracks anyone's device.
- **Time zones:** browser local time in the UI → UTC ISO strings → UTC `DATETIME`. Weekday/hour analytics are UTC.

## Business rules (enforced in backend)
Cannot book own resource · end > start, start in future, 30 min–24 h · resource must be `Available` · overlap with Pending/Approved rejected (transaction + row lock) · approval re-checks conflicts · cancel: Pending anytime, Approved ≥2 h before start · complete only after start · review only by borrower of a Completed booking, one per booking · payment only after approval, one per booking · admin role only via DB (`users.role`).

## API (base `/api`, JWT `Authorization: Bearer …`)
| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET/PUT /auth/me` |
| Categories | `GET /categories` |
| Resources | `GET /resources` (q, category_id, min_price, max_price, availability, location, lat, lng, radius_km, sort, page), `GET /resources/mine`, `GET /resources/:id`, `GET /resources/:id/similar`, `GET /resources/:id/availability`, `POST /resources`, `PUT /resources/:id`, `PUT /resources/:id/availability`, `DELETE /resources/:id` |
| Bookings | `POST /bookings`, `GET /bookings/my`, `GET /bookings/owner`, `GET /bookings/:id`, `PUT /bookings/:id/status` {Approved\|Rejected}, `PUT /bookings/:id/complete`, `PUT /bookings/:id/cancel` |
| Payments | `POST /payments` (simulated), `GET /payments/my`, `GET /payments/received` |
| Reviews | `POST /reviews`, `GET /reviews/resource/:id` |
| Notifications | `GET /notifications/my`, `GET /notifications/unread-count`, `PUT /notifications/:id/read`, `PUT /notifications/read-all` |
| Favourites | `GET /favourites`, `GET /favourites/ids`, `POST/DELETE /favourites/:resourceId` |
| Reports | `POST /reports` |
| Analytics | `GET /analytics/dashboard`, `/analytics/recommendations`, `/analytics/demand` |
| Admin | `GET /admin/summary`, `/admin/users`, `/admin/resources`, `/admin/reports`; `PUT /admin/users/:id/status`, `/admin/resources/:id/moderation`, `/admin/reports/:id` |
Errors: `{ "error": { "message", "details?" } }`.

## Manual test checklist
1. Register (Owner) → logged in. 2. Add resource (use “Find on map” or click map); check row in MySQL `resources`. 3. It appears in Explore and Map. 4. Search/filter/sort; “Use my location” → distance filter. 5. Register/log in as Borrower; open detail, see busy slots. 6. Try end ≤ start → rejected. 7. Book a slot; try overlapping slot → 409. 8. Owner sees request + notification badge; Approve. 9. Borrower sees Approved, pays (simulated) → Payment history/receipt. 10. Owner “Mark completed” (only after start time; seed has none, so create a booking starting soon or adjust a row’s `start_at`). 11. Borrower reviews; second review rejected. 12. Favourite/unfavourite; Favourites page. 13. Recommendations (try keywords, budget, time window). 14. Demand analytics (forecast shows “insufficient data” until ≥20 bookings over ≥8 weeks). 15. Admin: disable user, suspend resource, resolve report. 16. Call an API route without a token → 401; as non-admin `/admin/summary` → 403. 17. Resize to mobile width: hamburger menu, forms usable.

## Status
Tested: unit tests for validation, overlap, pricing, cancel/complete rules, forecast, scoring, haversine, simulated payment (`npm test`, 11 passing). Backend files pass `node --check`; frontend parses with `tsc`.
**Not yet run:** the API against a live MySQL, the frontend build/typecheck (dependencies were not installable in the authoring environment), and the end-to-end flows above. Expect small fixes on first run.
## Not implemented
Owner-defined recurring availability slots (bookings use free time ranges + busy-slot display) · recently-viewed list · image upload (URL only) · rate limiting/helmet · automated API/integration and UI tests · WebSockets (polling is used).
