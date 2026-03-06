# Local Development Guide

This guide explains how to run PackageGuard locally for development and testing.

## Quick Start (Local Postgres + Redis)

The simplest setup uses Docker Compose to run a local Postgres database and Redis:

```bash
cd packageguard-api/docker
docker compose up --build
```

This starts:
- **Postgres** on `localhost:5432` (user: `packageguard`, password: `packageguard`, db: `packageguard`)
- **Redis** on `localhost:6379`
- **API** on `http://localhost:4000`

The API will automatically:
1. Run migrations (`npm run migrate`)
2. Seed test data (`npm run seed`)
3. Start the server (`node src/app.js`)

### Test Data

After seeding, you can log in as:
- **Email**: `demo@packageguard.test`
- **Password**: `Test1234!`
- **Seller ID**: `sel_testdemo`

## Using Supabase for Local Dev (Production-like)

To test against your actual Supabase database and storage:

1. **Create `.env` file** in `packageguard-api/`:

```bash
cd packageguard-api
cp env.example .env  # if env.example exists, or create .env manually
```

2. **Edit `.env`** with your Supabase credentials:

```bash
# Core server
PORT=4000
NODE_ENV=production

# Supabase Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres

# Supabase Storage (evidence photos)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=evidence

# Auth
JWT_SECRET=your-local-jwt-secret
JWT_REFRESH_SECRET=your-local-refresh-secret

# Public base URL (for local dev)
PUBLIC_BASE_URL=http://localhost:4000

# Signing key (optional for local dev, but recommended)
SIGNING_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

3. **Run migrations** (if not already done on Supabase):

```bash
cd packageguard-api
npm install
npm run migrate
```

4. **Start the API**:

```bash
npm start
```

Or use Docker Compose with Supabase:

```bash
cd packageguard-api/docker
docker compose --env-file ../.env up
```

## Android App Local Development

The Android app is configured to use different API URLs for debug vs release builds:

- **Debug build** (default): `http://10.0.2.2:4000` (Android emulator → host machine)
- **Release build**: `https://YOUR-SERVICE-NAME.onrender.com` (production Render URL)

### For Android Emulator

1. Start the API locally (Docker or `npm start`)
2. Build and run the debug APK:

```bash
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

The app will connect to `http://10.0.2.2:4000` (which maps to `localhost:4000` on your host).

### For Physical Device on Same Wi‑Fi

1. Find your machine's local IP (e.g., `192.168.1.100`)
2. Update `app/build.gradle` debug build type:

```groovy
debug {
    buildConfigField "String", "API_BASE_URL", '"http://192.168.1.100:4000"'
}
```

3. Rebuild and install the debug APK

## Production Build (Release APK)

Before building a release APK, **update the Render URL** in `app/build.gradle`:

```groovy
release {
    buildConfigField "String", "API_BASE_URL", '"https://your-actual-service.onrender.com"'
}
```

Then build:

```bash
./gradlew assembleRelease
```

The release APK will be at `app/build/outputs/apk/release/app-release.apk`.

## Troubleshooting

### "Connection refused" from Android app

- **Emulator**: Make sure the API is running on `localhost:4000` and the app uses `http://10.0.2.2:4000`
- **Physical device**: Update the debug `API_BASE_URL` to your machine's LAN IP address

### "ENETUNREACH" or database connection fails

- Verify `DATABASE_URL` is correct (Supabase URI format)
- Check Supabase project is "Ready" (not paused)
- For Docker: ensure the `db` service is healthy (`docker compose ps`)

### Migrations fail

- All migrations use `IF NOT EXISTS` — safe to run multiple times
- If tables already exist, migrations will skip them automatically

### Storage upload fails (Supabase)

- Verify `SUPABASE_STORAGE_BUCKET` exists in Supabase (name: `evidence`, private)
- Check `SUPABASE_SERVICE_ROLE_KEY` is correct (not the anon key)
