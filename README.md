# RealPhotoTaker / PackageGuard Demo

Native Android client + Node.js API demo for tamper-evident package photo capture.

- **Android app**: `app/` (Java, CameraX, Hilt, Retrofit)
- **Backend API**: `packageguard-api/` (Node 18+, Express, PostgreSQL)

## Backend: Quick Start

```bash
cd packageguard-api
npm install
cp env.example .env   # if .env does not already exist
# Edit .env with your Supabase DATABASE_URL, JWT secrets, and storage/signing settings

npm run migrate        # runs src/migrations over DATABASE_URL
npm run seed           # optional: inserts demo seller and claim
npm start              # starts API on PORT (default 4000)
```

For Render, see `DEPLOYMENT.md` for a complete, step‑by‑step guide. At minimum you will need:

- `DATABASE_URL` → Supabase connection string
- `NODE_ENV` → `production`
- `PUBLIC_BASE_URL` → your Render URL, e.g. `https://realphototaker-api.onrender.com`
- `PORT`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` (evidence photos)
- `SIGNING_PRIVATE_KEY_PEM` (required in production for stable claim signatures)

## Database Schema (Supabase)

The core schema is defined in `packageguard-api/src/migrations/001_init_schema.sql` and `002_seller_review.sql`.

For Supabase you can paste those SQL files into the **SQL Editor** or run the Node migrations locally pointing `DATABASE_URL` at your Supabase instance:

```bash
cd packageguard-api
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres" npm run migrate
```

## Android App Configuration

In `app/build.gradle`:

```groovy
defaultConfig {
    // ...
    // Set this to your Render URL (no trailing slash)
    buildConfigField "String", "API_BASE_URL", '"https://realphototaker-api.onrender.com"'
}
```

The Retrofit client uses `BuildConfig.API_BASE_URL` via `NetworkModule`, so updating this one line points the app at your deployed API.

## CI / CD

GitHub Actions workflows live under `.github/workflows/`:

- `deploy-api.yml` — optional Render deploy hook trigger (set `RENDER_DEPLOY_HOOK` secret)
- `android-build.yml` — builds debug APK on pushes / PRs
- `android-release.yml` — builds a release APK and attaches it to GitHub Releases when you push a tag like `v1.0.0`

