# PackageGuard — Production Deployment Guide
## Stack: Supabase (database + file storage) + Render (API) + Android (release APK)

---

## Overview

```
Android App (release APK)
        ↓ HTTPS
Render Web Service  (Node.js API — free tier)
        ↓ SSL
Supabase PostgreSQL (database — free tier)
Supabase Storage    (evidence photos — free tier, 1 GB included)
```

Everything runs on free tiers.

---

## Step 1 — Push your code to GitHub

Both the API and Android project must be in a GitHub repo so Render can deploy from it.

```bash
cd /home/user/AndroidStudioProjects/RealPhotoTaker
git add .
git commit -m "prepare for production deployment"
git remote add origin https://github.com/YOUR-USERNAME/packageguard.git
git push -u origin main
```

---

## Step 2 — Supabase (Database + Storage)

### 2a — Create a project

1. Go to https://supabase.com → **New project**
2. Fill in project name, choose a strong database password, pick a region
3. Save the password — you'll need it
4. Wait ~1 minute for the project to initialise

### 2b — Run the database migrations

1. In your Supabase project → **SQL Editor** → **New query**
2. Run each file in order (paste content → click **Run**):
   - `packageguard-api/src/migrations/001_init_schema.sql`
   - `packageguard-api/src/migrations/002_seller_review.sql`
   - `packageguard-api/src/migrations/003_ai_email_plan.sql`

   Each should return "Success. No rows returned."

> **Terminal alternative:**
> ```bash
> psql "postgresql://postgres:PASSWORD@db.PROJECT-REF.supabase.co:5432/postgres" \
>   -f packageguard-api/src/migrations/001_init_schema.sql \
>   -f packageguard-api/src/migrations/002_seller_review.sql \
>   -f packageguard-api/src/migrations/003_ai_email_plan.sql
> ```

### 2c — Create the Storage bucket

1. In Supabase → **Storage** (left sidebar) → **New bucket**
2. Name: `evidence`
3. **Public bucket: OFF** (keep it private — the API serves files with auth)
4. Click **Save**

### 2d — Get your credentials

**Database connection string:**
- Settings → Database → Connection string → URI tab
- Looks like: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

**Supabase API credentials:**
- Settings → API
- Copy **Project URL** → this is `SUPABASE_URL` (e.g. `https://abcdef.supabase.co`)
- Copy **service_role** secret (under "Project API keys") → this is `SUPABASE_SERVICE_ROLE_KEY`

> Keep the `service_role` key private — it bypasses row-level security.

---

## Step 3 — Render (API)

### 3a — Create a Web Service

1. Go to https://render.com → **New** → **Web Service**
2. Connect your GitHub account → select your repo
3. Render auto-detects `render.yaml`. Click **Apply**.
   If not auto-detected, fill in manually:
   | Field | Value |
   |---|---|
   | Root directory | `packageguard-api` |
   | Build command | `npm install --production` |
   | Start command | `npm start` |
   | Node version | `18` (or `20`, which Supabase's SDK recommends) |

### 3b — Set environment variables

In Render → your service → **Environment**, add:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Supabase connection string from Step 2d |
| `JWT_SECRET` | output of `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | output of `openssl rand -hex 32` (different value) |
| `PUBLIC_BASE_URL` | `https://YOUR-SERVICE-NAME.onrender.com` |
| `SUPABASE_URL` | from Step 2d (e.g. `https://abcdef.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role secret from Step 2d |
| `SUPABASE_STORAGE_BUCKET` | `evidence` |
| `SIGNING_PRIVATE_KEY_PEM` | **Required in production**. RSA private key in PEM form; see "Signing key" below. |
| `PORT` | `4000` |

> Generate secrets: run `openssl rand -hex 32` twice on your machine.

### 3c — Deploy

Click **Manual Deploy** → **Deploy latest commit**, or just push to `main` — Render auto-deploys on every push.

Watch the deploy logs. You should see:
```
Running migrations...
Applying migration: 001_init_schema.sql ... done
Applying migration: 002_seller_review.sql ... done
Applying migration: 003_ai_email_plan.sql ... done
PackageGuard API listening on port 4000
```

### 3d — Verify

Visit `https://YOUR-SERVICE-NAME.onrender.com/health` — you should see:
```json
{"status":"ok"}
```

---

## Step 4 — Android App (Release APK)

### 4a — Update the production API URL

In [app/build.gradle](app/build.gradle), replace the placeholder:

```groovy
release {
    buildConfigField "String", "API_BASE_URL", '"https://YOUR-SERVICE-NAME.onrender.com"'
}
```

### 4b — Create a signing keystore (first time only)

```bash
keytool -genkey -v \
  -keystore packageguard-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias packageguard
```

Save the `.jks` file and password — **you need this same keystore for every future update**.

### 4c — Configure signing in build.gradle

```groovy
android {
    signingConfigs {
        release {
            storeFile file("/path/to/packageguard-release.jks")
            storePassword "YOUR_STORE_PASSWORD"
            keyAlias "packageguard"
            keyPassword "YOUR_KEY_PASSWORD"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            // ... existing config
        }
    }
}
```

### 4d — Build and install

```bash
./gradlew assembleRelease
adb install app/build/outputs/apk/release/app-release.apk
```

---

## Step 5 — Test end-to-end

1. Register as a seller → copy your **Seller ID** from the dashboard
2. Log out → tap "I'm a buyer" → enter Seller ID + order number → submit claim
3. Take photos → submit
4. Log back in as seller → Claims → approve the claim
5. Re-enter same seller + order as buyer → status page shows "Decision Made"
6. Visit `https://YOUR-SERVICE-NAME.onrender.com/v1/verify/clm_XXXXX` in a browser

---

## Optional: Custom Domain

1. Render → **Settings** → **Custom Domains** → add your domain
2. Add CNAME in your DNS pointing to `YOUR-SERVICE-NAME.onrender.com`
3. Update `PUBLIC_BASE_URL` in Render environment to `https://yourdomain.com`
4. Rebuild the Android app with the new URL

---

## Optional: SendGrid Email

1. Create account at https://sendgrid.com → Settings → API Keys → Create
2. Add `SENDGRID_API_KEY=SG.xxxxx` to Render environment
3. Set `EMAIL_FROM` to a verified sender address in your SendGrid account

---

## Optional: AI Image Analysis

```
AI_ANALYSIS_ENABLED=true
AI_ANALYSIS_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

Add these to Render environment, then follow the activation steps commented inside
`packageguard-api/src/services/imageAnalysisService.js`.

---

## Optional: Signing key (`SIGNING_PRIVATE_KEY_PEM`)

By default, the API generates an **ephemeral signing key** on startup for local development.
In production you must provide a **stable RSA private key** so that signed claims remain
verifiable across restarts:

```bash
openssl genrsa -out signing-key.pem 2048
cat signing-key.pem
```

Copy the full contents (including `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----`
lines) into the `SIGNING_PRIVATE_KEY_PEM` environment variable on Render.

If `SIGNING_PRIVATE_KEY_PEM` is not set in production, verification links may break after a
deploy because a new ephemeral key will be generated.

---

## Optional: Swapping out Supabase Storage

Evidence photos are stored via a small, provider-agnostic wrapper in
`packageguard-api/src/services/storageService.js`. The rest of the codebase only calls:

- `uploadFile(storagePath, buffer, mimeType)`
- `downloadFile(storagePath)`

To switch from Supabase Storage to S3, GCS, Cloudflare R2, or any other provider:

1. **Update the client**: replace the `client()` implementation in
   `storageService.js` with your new provider’s SDK initialization.
2. **Update the methods**: rewrite the bodies of `uploadFile` and `downloadFile`
   to call your provider instead of Supabase.
3. **Update env vars**: remove `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   and `SUPABASE_STORAGE_BUCKET` from your config and add whatever your new
   provider needs (e.g. `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`).

No controllers, workers, or routes need to change when you swap providers; everything
goes through `storageService.js`.

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| API returns 500 | `DATABASE_URL` wrong or SSL issue | Check Render logs; verify connection string |
| `Storage upload failed` | Bucket doesn't exist or wrong key | Create `evidence` bucket in Supabase Storage; verify `SUPABASE_SERVICE_ROLE_KEY` |
| `Storage download failed` | File not found in bucket | Evidence was uploaded before Supabase Storage was configured |
| App says "Network error" | Wrong API URL in APK | Rebuild release with correct `API_BASE_URL` |
| Photos not showing in seller app | Wrong `SUPABASE_URL` or key | Check env vars; test with `/health` endpoint |
| `401 Unauthorized` | JWT_SECRET changed | Changing the secret invalidates all tokens — users must log in again |
| Migrations fail | Already ran manually | Safe to ignore — all use `IF NOT EXISTS` |
