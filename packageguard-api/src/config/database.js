/**
 * database.js
 *
 * PostgreSQL connection pool shared across the entire API. Uses the pg library's Pool to
 * manage up to 10 concurrent connections. In production (Supabase) SSL is enabled
 * automatically via the NODE_ENV environment variable.
 *
 * Main exports:
 *   query(text, params)  – run a single parameterized SQL statement; returns pg QueryResult
 *   getClient()          – check out a dedicated pooled connection for multi-statement
 *                          transactions; caller must call client.release() when done
 *
 * Env vars: DATABASE_URL, NODE_ENV
 */

const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  // Supabase (and most managed Postgres hosts) require SSL in production.
  // rejectUnauthorized: false accepts their certificates without a local CA bundle.
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

async function query (text, params) {
  return pool.query(text, params);
}

async function getClient () {
  return pool.connect();
}

module.exports = {
  query,
  getClient
};

