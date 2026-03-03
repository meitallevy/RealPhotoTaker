/**
 * planService.js
 *
 * Foundation for the PackageGuard plan / tier billing system.
 * Current tiers (limits can be overridden per-seller in the DB):
 *
 *   trial    –  5 / day,   30 / month,  100 total
 *   small    – 20 / day,  200 / month,  unlimited total
 *   pro      – 100 / day, 1 000 / month, unlimited total
 *   business – 500 / day, 5 000 / month, unlimited total
 *   ultra    – unlimited
 *
 * Limits are stored in the sellers table (plan_daily_limit,
 * plan_monthly_limit, plan_total_limit) so they can be adjusted
 * per seller without a code deploy.  NULL means unlimited.
 */

const db = require('../config/database');

/** Reference defaults — used by registration and admin tooling. */
const PLAN_DEFAULTS = {
  trial:    { daily: 5,    monthly: 30,    total: 100  },
  small:    { daily: 20,   monthly: 200,   total: null },
  pro:      { daily: 100,  monthly: 1000,  total: null },
  business: { daily: 500,  monthly: 5000,  total: null },
  ultra:    { daily: null, monthly: null,  total: null }
};

/**
 * Count claims for a seller across four time windows.
 * @param {string} sellerInternalId  The UUID primary key from the sellers table.
 * @returns {{ today: number, thisWeek: number, thisMonth: number, total: number }}
 */
async function getClaimCounts (sellerInternalId) {
  const res = await db.query(
    `SELECT
       COUNT(*)                                                                AS total,
       COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)                     AS today,
       COUNT(*) FILTER (WHERE created_at >= date_trunc('week',  NOW()))       AS this_week,
       COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))       AS this_month
     FROM claims
     WHERE seller_id = $1`,
    [sellerInternalId]
  );
  const r = res.rows[0];
  return {
    today:     Number(r.today      || 0),
    thisWeek:  Number(r.this_week  || 0),
    thisMonth: Number(r.this_month || 0),
    total:     Number(r.total      || 0)
  };
}

/**
 * Check whether a seller is allowed to create another claim.
 * @param {string} sellerId  Public seller_id string (e.g. "sel_abc123").
 * @returns {{ allowed: boolean, reason?: string, counts: object }}
 */
async function checkPlanLimit (sellerId) {
  const sellerRes = await db.query(
    `SELECT id, plan, plan_daily_limit, plan_monthly_limit, plan_total_limit
     FROM sellers WHERE seller_id = $1`,
    [sellerId]
  );
  if (sellerRes.rowCount === 0) {
    return { allowed: false, reason: 'Seller not found', counts: {} };
  }
  const s = sellerRes.rows[0];
  const counts = await getClaimCounts(s.id);

  if (s.plan_daily_limit   != null && counts.today     >= s.plan_daily_limit) {
    return { allowed: false, reason: `Daily claim limit of ${s.plan_daily_limit} reached (${counts.today} today). Upgrade to a higher plan.`, counts };
  }
  if (s.plan_monthly_limit != null && counts.thisMonth >= s.plan_monthly_limit) {
    return { allowed: false, reason: `Monthly claim limit of ${s.plan_monthly_limit} reached. Upgrade to a higher plan.`, counts };
  }
  if (s.plan_total_limit   != null && counts.total     >= s.plan_total_limit) {
    return { allowed: false, reason: `Total claim limit of ${s.plan_total_limit} reached. Upgrade to a higher plan.`, counts };
  }

  return { allowed: true, counts };
}

module.exports = { getClaimCounts, checkPlanLimit, PLAN_DEFAULTS };
