/**
 * runMigrations.js
 *
 * Schema migration runner. Reads all .sql files in the same directory, sorts them by
 * filename (001_, 002_, …), skips any already recorded in the schema_migrations table,
 * and applies the remainder in order inside individual transactions.
 *
 * Run automatically at API startup via the npm start script:
 *   "start": "node src/migrations/runMigrations.js && node src/app.js"
 *
 * Can also be run standalone:
 *   DATABASE_URL=... node src/migrations/runMigrations.js
 *
 * All migrations use IF NOT EXISTS so they are safely idempotent — running them twice
 * has no effect. The schema_migrations table tracks which files have been applied.
 */

const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function ensureMigrationsTable () {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations () {
  const res = await db.query('SELECT filename FROM schema_migrations');
  return new Set(res.rows.map(r => r.filename));
}

async function applyMigration (filename, sql) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    );
    await client.query('COMMIT');
    // eslint-disable-next-line no-console
    console.log(`Applied migration ${filename}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function run () {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const dir = path.join(__dirname);
  const files = fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await applyMigration(file, sql);
  }
}

run()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Migrations completed');
    process.exit(0);
  })
  .catch(err => {
    // eslint-disable-next-line no-console
    console.error('Migration failed', err);
    process.exit(1);
  });

