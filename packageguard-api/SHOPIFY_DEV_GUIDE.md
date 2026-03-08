# Shopify App — Development & Testing Guide

This guide walks through setting up the PackageGuard Shopify embedded app for
development and testing.  The app is **not published to the Shopify App Store
yet** — you will install it only on your own development store.

---

## What you need

| Tool | Where to get it |
|------|----------------|
| Shopify Partners account | https://partners.shopify.com (free) |
| Development store | Create from Partners dashboard → Stores → Add store |
| Node.js ≥ 18 | https://nodejs.org |
| A public HTTPS URL | Render free tier **or** ngrok for local dev |

---

## Step 1 — Create a Shopify Partners app

1. Log in to https://partners.shopify.com
2. **Apps → Create app → Create app manually**
3. Fill in:
   - **App name**: `PackageGuard` (or any dev name)
   - **App URL**: `https://YOUR-RENDER-URL.onrender.com`  *(set properly later)*
4. Click **Create app**.
5. Go to **API credentials** and note:
   - **API key** → `SHOPIFY_API_KEY`
   - **API secret key** → `SHOPIFY_API_SECRET`

---

## Step 2 — Configure redirect URLs

In your app's **Configuration** tab:

- **App URL**: `https://YOUR-RENDER-URL.onrender.com`
- **Allowed redirection URLs**:
  ```
  https://YOUR-RENDER-URL.onrender.com/auth/shopify/callback
  ```

Save changes.

---

## Step 3 — Deploy the backend to Render (free tier)

> Skip to Step 3b if you want to test locally with ngrok instead.

### 3a — Render deployment

1. Push this repo to GitHub (if you haven't already).
2. Go to https://render.com → **New → Web Service**.
3. Connect your GitHub repo, set:
   - **Root directory**: `packageguard-api`
   - **Build command**: `npm run build:all`
   - **Start command**: `npm start`
4. Add environment variables (see Step 4).
5. Deploy and note the `https://xxxx.onrender.com` URL.
6. Go back to Partners dashboard and update **App URL** and **Redirect URLs**
   with the actual Render URL.

### 3b — Local development with ngrok

```bash
# Terminal 1 — start the API
cd packageguard-api
npm install
cp .env.example .env   # fill in your values
npm run dev

# Terminal 2 — expose it publicly
npx ngrok http 4000
# Note the https://abc123.ngrok.io URL
```

Update your Partners dashboard **App URL** and **Redirect URL** to the ngrok URL
every time it changes (or use a paid ngrok account for a stable subdomain).

---

## Step 4 — Environment variables

Copy `.env.example` → `.env` and fill in every value:

```
# Existing
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://...
JWT_SECRET=any_random_string_for_dev
JWT_REFRESH_SECRET=any_random_string_for_dev
PUBLIC_BASE_URL=https://YOUR-URL.onrender.com

# Supabase (for evidence photo storage)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=evidence

# Shopify — from Partners dashboard (Step 1)
SHOPIFY_API_KEY=abc123...
SHOPIFY_API_SECRET=shpss_...
SHOPIFY_SCOPES=read_orders,write_orders
SHOPIFY_APP_URL=https://YOUR-URL.onrender.com
SHOPIFY_WEBHOOK_SECRET=generate_with: openssl rand -hex 32
```

For Render, add these in **Environment → Environment Variables** in the dashboard.

---

## Step 5 — Build the frontend

```bash
cd packageguard-api
npm run build:frontend
```

This creates `public/shopify/index.html` and `public/shopify/bundle.*.js`.
The Express server serves these at `/shopify/*`.

> **Render does this automatically** via `npm run build:all` in the build command.

---

## Step 6 — Install on your development store

1. In Partners dashboard → your app → **Test your app**.
2. Select your development store and click **Install app**.
3. Shopify redirects to:
   ```
   https://YOUR-URL.onrender.com/auth/shopify?shop=your-store.myshopify.com
   ```
4. You're redirected to Shopify's permissions screen — click **Install**.
5. Shopify redirects to `/auth/shopify/callback`, which:
   - Exchanges the code for an access token
   - Creates a seller row in the database
   - Redirects you to Shopify Admin

6. Shopify Admin loads the embedded React app at `/shopify/`.

---

## Step 7 — Configure webhooks (optional for dev)

In Partners dashboard → your app → **Webhooks**:

| Event | URL |
|-------|-----|
| `app/uninstalled` | `https://YOUR-URL/webhooks/shopify/app/uninstalled` |
| `orders/create`   | `https://YOUR-URL/webhooks/shopify/orders/create`   |

Webhook secret = value of `SHOPIFY_WEBHOOK_SECRET` in your env.

Webhooks don't fire on localhost — use Render or ngrok for webhook testing.

---

## Step 8 — Verify the setup

### Backend health
```bash
curl https://YOUR-URL.onrender.com/health
# {"status":"ok"}
```

### Seller dashboard (after install)
The React app at `/shopify/` should show:
- Your Shopify store name as business name
- `email: shopify_your-store.myshopify.com` (synthetic email for OAuth sellers)
- Trial plan, 0 claims

### Android app still works
The Android app continues to use JWT auth — nothing changes for existing sellers.

---

## Troubleshooting

### "HMAC signature invalid" on OAuth callback
- Check `SHOPIFY_API_SECRET` matches the Partners dashboard secret exactly.
- Make sure the Redirect URL in Partners exactly matches `SHOPIFY_APP_URL/auth/shopify/callback`.

### "Missing or invalid shop parameter"
- Shop must end in `.myshopify.com`.
- Example: `https://YOUR-URL/auth/shopify?shop=my-store.myshopify.com`

### "Seller not found" after install
- The session is in-memory. If the server restarted between OAuth and the API call,
  the adapter falls back to a DB lookup.
- Check the DB: `SELECT * FROM sellers WHERE platform_type = 'shopify';`

### Embedded app shows blank page
- Make sure the frontend was built: `npm run build:frontend`
- Check that `public/shopify/index.html` exists.
- Check browser console for CSP or CORS errors.

### React app can't reach API (`401 Unauthorized`)
- Verify `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are set correctly.
- App Bridge session token verification uses `SHOPIFY_API_SECRET` as the HMAC key.
- Check the `X-Shopify-Shop-Domain` header is being sent (look at Network tab).

### Database migration failed at startup
- Check `DATABASE_URL` is correct.
- Run `npm run migrate` standalone to see the full error.
- Migration 004 makes `users.password_hash` nullable — this is safe and idempotent.

---

## Architecture recap

```
Merchant browser
  └─► Shopify Admin (iframe)
        └─► GET /shopify/ → React app
              └─► fetch /v1/seller/* with Bearer session token + X-Shopify-Shop-Domain
                    └─► authAbstraction.js
                          ├─ ShopifyAdapter.canAuthenticate() → true
                          └─ ShopifyAdapter.authenticate()
                                ├─ verify session token (HS256, SHOPIFY_API_SECRET)
                                ├─ extract shop domain from "dest" claim
                                └─ lookup sellers row → req.user.sellerId
                                      └─► sellerController (unchanged, uses req.user.sellerId)

Android App
  └─► fetch /v1/seller/* with Bearer JWT
        └─► authAbstraction.js
              ├─ ShopifyAdapter.canAuthenticate() → false (no x-shopify header)
              └─ JwtAdapter.canAuthenticate() → true
                    └─ JwtAdapter.authenticate() → verifies JWT_SECRET → req.user.sellerId
```

Both paths resolve to the same `req.user.sellerId` and hit the same controllers.

---

## Next steps (when ready to publish)

1. Submit app to Shopify App Store review.
2. Switch from Render free tier to paid (always-on) for production.
3. Replace in-memory `shopifySessionService` Map with Redis for multi-instance deploys.
4. Enable email notifications via SendGrid for Shopify sellers.
5. Add QR code generation in the dashboard so buyers can scan to open the claim form.
