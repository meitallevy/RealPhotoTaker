## PackageGuard API (Backend)

Node.js/Express implementation of the PackageGuard backend, designed as a **thick server** for thin mobile clients.

### Tech stack
- **Runtime**: Node.js 18+
- **Web framework**: Express
- **Database**: PostgreSQL
- **Cache**: Redis

### Getting started (local, with Docker)

```bash
cd packageguard-api/docker
docker compose up --build
```

Then run migrations in another terminal:

```bash
cd /home/user/AndroidStudioProjects/RealPhotoTaker/packageguard-api
npm install
DATABASE_URL=postgres://packageguard:packageguard@localhost:5432/packageguard node src/migrations/runMigrations.js
```

API will be available at `http://localhost:4000`.

### Environment variables

- `PORT` (default: `4000`)
- `DATABASE_URL` (PostgreSQL connection string)
- `REDIS_URL` (Redis connection string)
- `JWT_SECRET` (access token signing key)
- `JWT_REFRESH_SECRET` (refresh token signing key)

