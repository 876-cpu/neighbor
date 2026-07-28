# Neighbor

A single-seller online storefront where buyer registration is gated by a
whitelist (your approved contact list). Only email addresses you've
pre-approved can create an account; everyone else is rejected at signup.

## How the whitelist works

- `src/data/whitelist.json` holds the approved list. Entries can be:
  - `"someone@example.com"` — exact address
  - `"@company.com"` — allows anyone on that domain
- Registration (`POST /api/auth/register`) checks the submitted email against
  this list **before** creating any account. Anyone not on it gets a 403.
- The seller manages this list from the dashboard (`/seller.html`), or via
  the CLI:
  ```bash
  npm run seed:whitelist -- alice@example.com bob@example.com
  ```

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:
- `JWT_SECRET` — generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `SELLER_SETUP_TOKEN` — any random string, used once to create the seller account
- `CORS_ORIGIN` — your frontend URL (defaults to localhost)

Run it:
```bash
npm start
```

Then in your browser:
1. Go to `http://localhost:3000/seller-setup.html` and create **the** seller
   account using your `SELLER_SETUP_TOKEN`. This only works once — the system
   enforces exactly one seller.
2. Log in at `/seller.html` (via `/login.html`) and add approved emails to
   the whitelist.
3. Buyers with whitelisted emails can register at `/register.html`.

## Ordering and live delivery tracking

- Products now require login to view — the storefront redirects anyone not
  logged in straight to the login page. Only registered (whitelisted)
  buyers and the seller can see the catalog at all.
- Once logged in, buyers add items to a cart (stored on their device), then
  go through checkout.
- At checkout, the buyer enters a phone number and grants location
  permission. After the order is placed, their browser keeps streaming GPS
  updates (`navigator.geolocation.watchPosition`) over a live WebSocket
  connection (Socket.IO) for as long as the order is active.
- The seller's order detail page (`/order-detail-seller.html?orderId=...`)
  shows a live map (Leaflet + OpenStreetMap, no API key required) with a
  marker that moves in real time as the buyer's location updates, plus a
  tap-to-call phone number.
- Location sharing automatically stops once the seller marks the order
  "delivered" or "cancelled" — the buyer can also stop manually.
- The socket connection is authenticated with the same JWT cookie as the
  rest of the app: a buyer can only push updates for their own orders, and
  only that buyer or the seller can view them.

**Note on `localhost` vs deploying this for real:** browsers only allow the
Geolocation API on "secure contexts" — that means `https://` or
`http://localhost`. Testing on your own phone at `http://localhost:3000`
works fine. If you deploy this to a real domain later, it must be served
over HTTPS or location sharing will silently fail.

## What's implemented

- **Whitelist-gated registration** — the core ask. Checked server-side, not
  just hidden in the UI.
- **Single-seller enforcement** — `/api/auth/setup-seller` refuses to create
  a second seller account.
- **Password security** — bcrypt hashing (cost factor 12), never stored or
  logged in plaintext.
- **Session security** — JWTs in `httpOnly`, `sameSite=lax` cookies (and
  `secure` in production) so they aren't readable by JS or sent cross-site.
- **Rate limiting** on auth endpoints to slow brute-force/enumeration.
- **Generic auth errors** — login doesn't reveal whether an email exists.
- **Input validation** on every write endpoint (`express-validator`).
- **Security headers** via `helmet`, small JSON body limit, CORS locked to
  your configured origin.
- **Role-based access** — only the seller can manage products/whitelist;
  everyone can browse the storefront.
- **No inline scripts** — every page's JavaScript lives in its own `.js`
  file. This isn't just tidiness: `helmet`'s default Content-Security-Policy
  blocks inline `<script>` tags, which is what silently broke the storefront
  the first time around. Keeping scripts external means the strict CSP can
  stay on rather than being loosened.
- **Server-validated order pricing** — checkout sends product IDs and
  quantities only; prices/titles are looked up server-side from the product
  catalog so a buyer can't tamper with the total by editing client code.

## Before you deploy this for real

This is a solid starting point, not a finished production system. Before
going live:

1. **Swap the JSON-file store for a real database** (Postgres, SQLite,
   etc.). The file store in `src/utils/db.js` works for development/small
   scale but isn't built for concurrent write-heavy production traffic —
   the function signatures (`readJSON`/`writeJSON`) are deliberately small so
   swapping the implementation doesn't require touching the routes.
2. **Serve over HTTPS** (e.g. behind Caddy, Nginx, or your host's TLS) —
   cookies marked `secure` won't be sent over plain HTTP.
3. **Rotate `SELLER_SETUP_TOKEN`** or remove the `/setup-seller` route/file
   after creating the seller account.
4. **Add real payment processing** if you'll take orders — this starter
   only manages the product catalog, not checkout/payments.
5. **Back up `src/data/*.json`** (or your real DB) regularly.
6. Consider adding email verification, password reset flows, and 2FA for
   the seller account if this holds anything valuable.

## Project structure

```
one-seller-app/
  src/
    server.js           # Express app + security middleware
    routes/
      auth.js            # register (whitelist-checked), login, setup-seller
      whitelist.js        # seller-only whitelist management
      products.js          # public browsing, seller-only writes
    middleware/auth.js    # JWT verification + role checks
    utils/
      db.js               # tiny JSON-file persistence layer
      whitelist.js          # whitelist check/add/remove logic
      tokens.js             # JWT sign/verify
      seedWhitelist.js       # CLI helper
    data/                # users.json / whitelist.json / products.json
  public/                # storefront, register/login, seller dashboard
```
