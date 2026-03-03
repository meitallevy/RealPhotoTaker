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

