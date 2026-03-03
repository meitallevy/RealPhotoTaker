/**
 * Seed script — inserts a test seller account and a sample completed claim.
 * Run with:  node seed.js
 * Requires:  .env file with DATABASE_URL set
 */

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TEST_EMAIL    = 'demo@packageguard.test';
const TEST_PASSWORD = 'Test1234!';
const TEST_SELLER_ID = 'sel_testdemo';
const TEST_BUSINESS  = 'Demo Electronics Store';

async function seed () {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- 1. Delete in FK-safe order: evidence → claims → sellers (via users cascade) ---
    await client.query(
      `DELETE FROM evidence_items
       WHERE claim_id IN (
         SELECT c.id FROM claims c
         JOIN sellers s ON s.id = c.seller_id
         WHERE s.seller_id = $1
       )`,
      [TEST_SELLER_ID]
    );
    await client.query(
      `DELETE FROM claims
       WHERE seller_id IN (SELECT id FROM sellers WHERE seller_id = $1)`,
      [TEST_SELLER_ID]
    );
    await client.query(`DELETE FROM users WHERE email = $1`, [TEST_EMAIL]);

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, role, email_verified, is_active)
       VALUES ($1, $2, 'seller', true, true)
       RETURNING id, email`,
      [TEST_EMAIL, passwordHash]
    );
    const user = userRes.rows[0];

    // --- 2. Upsert test seller ---
    await client.query(`DELETE FROM sellers WHERE seller_id = $1`, [TEST_SELLER_ID]);
    await client.query(
      `INSERT INTO sellers (user_id, seller_id, business_name, country, notification_email)
       VALUES ($1, $2, $3, 'US', true)`,
      [user.id, TEST_SELLER_ID, TEST_BUSINESS]
    );

    // --- 3. Insert a sample completed claim so the seller dashboard shows stats ---
    const sampleClaimId = 'clm_demo0001';
    await client.query(`DELETE FROM claims WHERE claim_id = $1`, [sampleClaimId]);

    const sellerRow = await client.query(
      `SELECT id FROM sellers WHERE seller_id = $1`, [TEST_SELLER_ID]
    );
    const sellerUuid = sellerRow.rows[0].id;

    await client.query(
      `INSERT INTO claims (
         claim_id, seller_id, order_id, nonce, nonce_expires_at,
         status, risk_score, manifest_hash, pdf_url, created_at, completed_at
       ) VALUES (
         $1, $2, 'ORD-2025-00042', '481516', NOW() + INTERVAL '5 minutes',
         'COMPLETED', 12,
         'sha256:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
         NULL, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'
       )`,
      [sampleClaimId, sellerUuid]
    );

    await client.query('COMMIT');

    console.log('\n========== TEST DATA INSERTED ==========');
    console.log('');
    console.log('  SELLER LOGIN');
    console.log('  ────────────────────────────────────');
    console.log(`  Email    : ${TEST_EMAIL}`);
    console.log(`  Password : ${TEST_PASSWORD}`);
    console.log('');
    console.log('  SELLER INFO (returned after login)');
    console.log('  ────────────────────────────────────');
    console.log(`  Seller ID: ${TEST_SELLER_ID}`);
    console.log(`  Business : ${TEST_BUSINESS}`);
    console.log('');
    console.log('  BUYER DEEP LINK');
    console.log('  ────────────────────────────────────');
    console.log(`  packageguard://claim?seller=${TEST_SELLER_ID}`);
    console.log('');
    console.log('  SAMPLE ORDER ID (use in ClaimEntry screen)');
    console.log('  ────────────────────────────────────');
    console.log('  ORD-2025-00099');
    console.log('');
    console.log('  PRE-SEEDED COMPLETED CLAIM');
    console.log('  ────────────────────────────────────');
    console.log(`  Claim ID : ${sampleClaimId}`);
    console.log(`  Order ID : ORD-2025-00042`);
    console.log('');
    console.log('========================================\n');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
