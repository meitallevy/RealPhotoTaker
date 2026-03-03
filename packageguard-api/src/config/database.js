const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10
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

