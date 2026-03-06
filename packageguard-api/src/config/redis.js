/**
 * redis.js
 *
 * Thin wrapper around the Redis client for optional caching and session storage.
 * The connection is established lazily on first use. If REDIS_URL is not set the
 * client will fail silently on connect (errors are logged, not thrown), so the
 * rest of the API continues to work without Redis.
 *
 * Main exports:
 *   get(key)                  – retrieve a string value by key; returns null if missing
 *   set(key, value, options)  – store a string value; pass { ttlSeconds } to auto-expire
 *   client                    – the raw Redis client (for advanced operations)
 *
 * Env vars: REDIS_URL
 */

const { createClient } = require('redis');

const client = createClient({
  url: process.env.REDIS_URL
});

client.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Redis error', err);
});

async function connect () {
  if (!client.isOpen) {
    await client.connect();
  }
}

async function get (key) {
  await connect();
  return client.get(key);
}

async function set (key, value, options = {}) {
  await connect();
  if (options.ttlSeconds) {
    await client.set(key, value, { EX: options.ttlSeconds });
  } else {
    await client.set(key, value);
  }
}

module.exports = {
  client,
  get,
  set
};

