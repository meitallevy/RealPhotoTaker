# RealPhotoTaker – Complete Deployment Guide (Supabase + Render, Free Tier Friendly)

This guide walks you through taking the existing `RealPhotoTaker` project from **local dev** to a **deployed API on Render** with a **database on Supabase**, plus wiring the **Android app** to use it. It assumes you’re relatively new to this but comfortable clicking through UIs and copying/pasting commands.

Where possible, we stick to **free plans**. Docker is used only for **local development** (optional but easier), not for production hosting.

---

## 📋 Master Checklist

### Phase 1: Preparation
- [ ] 1.1 Create accounts on all platforms
- [ ] 1.2 Understand your project structure
- [ ] 1.3 Prepare environment variables list

### Phase 2: Database Setup (Supabase)
- [ ] 2.1 Create Supabase account
- [ ] 2.2 Create new project
- [ ] 2.3 Get connection string
- [ ] 2.4 Apply the existing schema

### Phase 3: API Deployment (Render)
- [ ] 3.1 Create Render account
- [ ] 3.2 Connect GitHub repository
- [ ] 3.3 Configure build settings
- [ ] 3.4 Add environment variables
- [ ] 3.5 Deploy and test

### Phase 4: Domain / URL
- [ ] 4.1 Use the free Render subdomain
- [ ] 4.2 Test API endpoints over HTTPS

### Phase 5: Android App Updates
- [ ] 5.1 Point `API_BASE_URL` at Render
- [ ] 5.2 Build release APK
- [ ] 5.3 Create GitHub Release
- [ ] 5.4 Upload APK

### Phase 6: CI/CD Automation (GitHub Actions)
- [ ] 6.1 Use existing workflows
- [ ] 6.2 Configure Render deploy hook secret
- [ ] 6.3 Test the pipeline

### Phase 7: Documentation & Env Files
- [ ] 7.1 Review README.md
- [ ] 7.2 Review LICENSE
- [ ] 7.3 Copy `env.example` → `.env`
- [ ] 7.4 Keep your Supabase / Render secrets safe

---

## 🔧 PHASE 1: Preparation

### 1.1 Create Accounts (All Free)

| Platform     | URL                | What For                | Sign Up With |
|--------------|--------------------|-------------------------|--------------|
| **Supabase** | https://supabase.com | PostgreSQL database     | GitHub       |
| **Render**   | https://render.com | API hosting             | GitHub       |
| **GitHub**   | https://github.com | Code + CI/CD + Releases | Email/GitHub |

> ⏱️ **Time needed:** ~10 minutes

### 1.2 Understand Your Project Structure

```text
RealPhotoTaker/
├── app/                     ← Android app (Java)
│   ├── src/
│   └── build.gradle
├── packageguard-api/        ← Backend API (Node.js + PostgreSQL)
│   ├── src/
│   │   ├── app.js           ← API entrypoint
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   └── migrations/      ← SQL schema (what you run on Supabase)
│   ├── env.example          ← Template for .env
│   ├── package.json
│   └── docker/              ← Local dev docker-compose (optional)
├── .github/workflows/       ← CI pipelines (API deploy, Android build/release)
├── README.md
├── LICENSE
├── build.gradle
└── settings.gradle
```

### 1.3 Environment Variables You’ll Need (API)

The backend already expects these (see `packageguard-api/env.example`):

```bash
# Database (Supabase or local)
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/postgres

# Server
PORT=4000
NODE_ENV=production
PUBLIC_BASE_URL=https://your-render-service.onrender.com

# Auth
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Optional
REDIS_URL=redis://localhost:6379/0
UPLOAD_ROOT=/var/data/packageguard/uploads
```

> 💡 **Redis note:** The current code only wires a Redis client but doesn’t actually use it anywhere critical yet. On Render you can safely **omit `REDIS_URL`** and it will work fine. Locally, the docker-compose file spins up a Redis container, but it’s not strictly required for basic flows.

**Action:** You don’t have to memorize these – just remember where they live:
- Local dev: `packageguard-api/.env` (you’ll create it from `env.example`).
- Render: set them in the web service’s **Environment** tab.

---

## 🗄️ PHASE 2: Database Setup (Supabase)

### 2.1 Create Supabase Account

1. Go to `https://supabase.com`.
2. Click **“Start your project”**.
3. Sign in with **GitHub**.
4. Authorize Supabase.

### 2.2 Create New Project

1. Click **“New Project”**.
2. Fill in:
   - **Name:** `realphototaker-db` (any name is fine).
   - **Database Password:** generate and **save this** (password manager / notes).
   - **Region:** choose closest to you (e.g. `eu-central-1` for Israel).
3. Click **“Create new project”**.
4. Wait 2–3 minutes for provisioning.

### 2.3 Get Connection String

1. In the Supabase project, go to **Settings → Database**.
2. Scroll to **“Connection string”**.
3. Select the **“URI”** tab.
4. Copy the URL:

```text
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

5. Replace `[YOUR-PASSWORD]` with the password from 2.2 if needed.

> ⚠️ **Save this URI** – you will paste it into:
> - `packageguard-api/.env` (for local dev and migrations), and  
> - Render’s `DATABASE_URL` variable.

### 2.4 Apply the Existing Schema

You **do not** need to design your own tables – they’re already defined in the migrations:

- `packageguard-api/src/migrations/001_init_schema.sql`
- `packageguard-api/src/migrations/002_seller_review.sql`

You have two options:

#### Option A – Run SQL directly in Supabase (simplest)

1. Open each file locally and copy its SQL:
   - `001_init_schema.sql`
   - `002_seller_review.sql`
2. In Supabase, go to **SQL** → **New query**.
3. Paste the content of `001_init_schema.sql`, click **Run**.
4. Paste the content of `002_seller_review.sql`, click **Run**.

That’s it – your tables are created.

#### Option B – Run migrations from your machine

1. In a terminal:

```bash
cd RealPhotoTaker/packageguard-api
npm install

# Temporarily set DATABASE_URL to your Supabase URI and run migrations
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres" \
  npm run migrate
```

### ✅ Phase 2 Checkpoint

You should now have:
- [ ] Supabase account created  
- [ ] Database project running  
- [ ] Connection string saved  
- [ ] Schema applied (via SQL editor or `npm run migrate`)  

---

## 🚀 PHASE 3: API Deployment (Render)

> We’ll deploy **`packageguard-api`** as a Render Web Service.

### 3.1 Create Render Account

1. Go to `https://render.com`.
2. Click **“Get Started for Free”**.
3. Sign in with **GitHub**.
4. Authorize Render to access your repositories.

### 3.2 Connect GitHub Repository

1. Click **“New +” → “Web Service”**.
2. Choose **“Build and deploy from a Git repository”**.
3. Select your `RealPhotoTaker` repo.
4. Click **“Connect”**.

### 3.3 Configure Build Settings

Fill the form as:

| Field            | Value                    |
|------------------|--------------------------|
| **Name**         | `realphototaker-api`     |
| **Region**       | closest to you           |
| **Branch**       | `main`                   |
| **Root Directory** | `packageguard-api`     |
| **Runtime**      | `Node`                   |
| **Build Command**| `npm install`            |
| **Start Command**| `npm start`              |
| **Instance Type**| `Free`                   |

### 3.4 Add Environment Variables

Still in the Render service setup, scroll to **Environment** and add:

| Key              | Value (example)                                              |
|------------------|--------------------------------------------------------------|
| `DATABASE_URL`   | your Supabase URI                                           |
| `NODE_ENV`       | `production`                                                |
| `PORT`           | `4000`                                                      |
| `PUBLIC_BASE_URL`| e.g. `https://realphototaker-api.onrender.com`             |
| `JWT_SECRET`     | a random string, e.g. from `uuidgen` or an online generator |
| `JWT_REFRESH_SECRET` | another random string                                   |

You can **leave out** `REDIS_URL` and `UPLOAD_ROOT` for now – they’re optional.

### 3.5 Deploy

1. Click **“Create Web Service”**.
2. Wait for the build and deploy (5–10 minutes first time).
3. Watch the logs; fix any typos in env vars if it fails.
4. When it’s live, you’ll get a URL like:

```text
https://realphototaker-api.onrender.com
```

### 3.6 Test Your API

Use a browser or terminal:

```bash
# Check basic health
curl https://realphototaker-api.onrender.com/health
```

You should see `{"status":"ok"}`.

### ⚠️ Render Free Tier Behavior

- Service sleeps after ~15 minutes of no traffic.
- The first request after sleeping can take **30–60 seconds** (cold start).
- For a personal project or demo, the free plan is fine.

If you want to keep it warm for demos, use a free cron service (like `cron-job.org`) to hit `/health` every ~14 minutes.

### ✅ Phase 3 Checkpoint

- [ ] Render account created  
- [ ] Web service configured (root dir = `packageguard-api`)  
- [ ] Env vars set (`DATABASE_URL`, `PORT`, `NODE_ENV`, `PUBLIC_BASE_URL`, secrets)  
- [ ] API reachable at `https://…onrender.com/health`  

---

## 🌐 PHASE 4: Domain / URL

For now, **use Render’s free subdomain**:

```text
https://realphototaker-api.onrender.com
```

Render issues HTTPS automatically – no extra work.

Custom domains (like `api.realphototaker.com`) are optional and can be added later via Render + a DNS provider (Cloudflare, etc.).

---

## 📱 PHASE 5: Android App Updates

### 5.1 Point the App at Render

The Android app uses `BuildConfig.API_BASE_URL` from `app/build.gradle`:

```groovy
defaultConfig {
    // ...
    // For emulator: http://10.0.2.2:4000 (local dev)
    // For device-on-LAN: http://192.168.x.x:4000
    // For production (Render):
    //   "https://realphototaker-api.onrender.com"
    buildConfigField "String", "API_BASE_URL", '"https://realphototaker-api.onrender.com"'
}
```

For production builds, set it to your Render URL (no trailing slash).

### 5.2 Build Release APK

In **Android Studio**:

1. Open the `app/` module.
2. From the top menu: **Build → Generate Signed Bundle / APK…**
3. Choose **APK**.
4. Create a new keystore (once) or reuse an existing one.
5. Select the **`release`** build type.
6. Finish and wait – the APK will be at:
   - `app/build/outputs/apk/release/app-release.apk`

Or via **command line**:

```bash
cd RealPhotoTaker
./gradlew assembleRelease
```

### 5.3 Create GitHub Release

1. On GitHub, go to your repo.
2. Click **“Releases” → “Draft a new release”**.
3. Tag: `v1.0.0` (or similar).
4. Title: `RealPhotoTaker v1.0.0`.
5. Drag & drop `app-release.apk` into the assets area.
6. Click **“Publish release”**.

Users can now download from:

```text
https://github.com/<your-user>/RealPhotoTaker/releases/latest
```

### ✅ Phase 5 Checkpoint

- [ ] `API_BASE_URL` points at Render  
- [ ] Release APK built and signed  
- [ ] GitHub Release created with APK attached  

---

## ⚙️ PHASE 6: CI/CD Automation (GitHub Actions)

> These workflows are already in the repo under `.github/workflows/`. You mainly need to **configure secrets**.

### 6.1 API Auto-Deploy Workflow

File: `.github/workflows/deploy-api.yml`

- Triggered on pushes to `main` that touch `packageguard-api/**`.
- Sends a POST request to a **Render Deploy Hook** URL.

Steps to enable:

1. In Render, go to your API service → **Settings**.
2. Find **“Deploy Hook”** and copy the URL.
3. In GitHub, go to **Settings → Secrets and variables → Actions → New repository secret**.
4. Name: `RENDER_DEPLOY_HOOK`, Value: the URL from Render.

Now, pushing code to `main` (backend folder) will trigger a new deploy.

### 6.2 Android Build Workflow

File: `.github/workflows/android-build.yml`

- Runs on pushes/PRs touching `app/**`.
- Builds a **debug APK** and uploads it as a build artifact.

No extra secrets needed.

### 6.3 Android Release Workflow

File: `.github/workflows/android-release.yml`

- Runs when you push a tag like `v1.0.0`.
- Builds `app-release.apk` and publishes a GitHub Release with the APK attached.
- Uses GitHub’s built-in `GITHUB_TOKEN` – no extra secret required.

### ✅ Phase 6 Checkpoint

- [ ] Render deploy hook secret set (`RENDER_DEPLOY_HOOK`)  
- [ ] Push to `main` → Render redeploys API  
- [ ] Tag push (`v1.0.0`) → Android release workflow runs  

---

## 📖 PHASE 7: Documentation & Env Files

### 7.1 README & LICENSE

- Root `README.md` already explains:
  - Architecture.
  - How to run the API and Android app locally.
  - Where the API is hosted.
- `LICENSE` uses the MIT license (simple and permissive).

### 7.2 Env Files

- In `packageguard-api/`:
  - `env.example` → copy to `.env` and fill in:

```bash
cp env.example .env
# Then edit .env with your Supabase DATABASE_URL and secrets
```

- On Render: mirror the same keys in the service’s **Environment** tab.

### 7.3 Local Dev with Docker (Optional but Easy)

If you just want to **play with everything locally** before Supabase/Render:

```bash
cd RealPhotoTaker/packageguard-api/docker
docker compose up --build
```

This will start:
- PostgreSQL (local, not Supabase).
- Redis (local).
- The API on `http://localhost:4000`.

You can then:
- Point the Android **emulator** at `http://10.0.2.2:4000`.
- Or a real device on your Wi‑Fi at `http://<your-lan-ip>:4000`.

> When you’re ready for “real” hosting, switch `DATABASE_URL` to Supabase, deploy on Render, and update `API_BASE_URL` to the Render URL.

---

## 🆘 Troubleshooting

### API Won’t Start on Render

1. Check Render logs.
2. Make sure `DATABASE_URL` is exactly your Supabase URI.
3. Confirm `PORT=4000` in env and no other process is bound.
4. Verify `npm start` works locally (from `packageguard-api/`).

### Database Connection Fails

1. Ensure Supabase project is “Ready” and not paused.
2. Double‑check password / URI.
3. Rerun the migrations or SQL scripts if tables are missing.

### Android App Can’t Reach API

1. Make sure the URL in `API_BASE_URL` is correct and **HTTPS** in production.
2. For emulator + local dev:
   - API running at `http://localhost:4000` on your computer.
   - App uses `http://10.0.2.2:4000`.
3. Ensure `INTERNET` permission is in `AndroidManifest.xml` (it already is in this project).

### GitHub Actions Failing

1. Open the **Actions** tab, click into the failed run.
2. Read the log lines near the bottom of the failed step.
3. Common issues:
   - Mis-typed secret name (`RENDER_DEPLOY_HOOK`).
   - Gradle build issues inside the app module.

---

**Created for the RealPhotoTaker project**  
**Last updated:** March 2026

