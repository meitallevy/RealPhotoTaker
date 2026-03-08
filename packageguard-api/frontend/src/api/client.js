/**
 * client.js  (frontend/src/api)
 *
 * API client for the Shopify embedded app.
 * Obtains a session token from App Bridge and attaches it to every request
 * along with the shop domain header so the server can route to the Shopify adapter.
 *
 * Usage:
 *   import { apiGet, apiPatch } from './api/client';
 *   const data = await apiGet('/v1/seller/dashboard');
 */

import { getSessionToken } from '@shopify/app-bridge/utilities';

/**
 * The App Bridge instance must be set before making any API calls.
 * Call setAppBridge(app) in App.jsx after creating the App Bridge instance.
 */
let _app = null;

export function setAppBridge (app) {
  _app = app;
}

/**
 * Get a fresh session token and the current shop domain.
 * @returns {Promise<{ token: string, shopDomain: string }>}
 */
async function getAuthHeaders () {
  if (!_app) throw new Error('App Bridge not initialised');

  const token = await getSessionToken(_app);
  const shopDomain = new URL(window.location.href).searchParams.get('shop') ||
    window.shopDomain || '';

  return {
    Authorization: `Bearer ${token}`,
    'X-Shopify-Shop-Domain': shopDomain,
    'Content-Type': 'application/json'
  };
}

/**
 * Perform an authenticated API request.
 * @param {string} path  e.g. '/v1/seller/dashboard'
 * @param {RequestInit} options
 * @returns {Promise<any>}
 */
async function request (path, options = {}) {
  const headers = await getAuthHeaders();
  const res = await fetch(path, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body.error && body.error.message) || res.statusText;
    throw new Error(`API error ${res.status}: ${msg}`);
  }

  return res.json();
}

export const apiGet = (path) => request(path, { method: 'GET' });
export const apiPatch = (path, body) =>
  request(path, { method: 'PATCH', body: JSON.stringify(body) });
export const apiPost = (path, body) =>
  request(path, { method: 'POST', body: JSON.stringify(body) });

/**
 * Fetch an authenticated binary resource (e.g. evidence image) and return a Blob.
 * Use this instead of a bare <img src> when the endpoint requires Authorization headers.
 *
 * @param {string} path  e.g. '/v1/seller/claims/xxx/evidence/yyy/image'
 * @returns {Promise<Blob>}
 */
export async function fetchBlob (path) {
  const headers = await getAuthHeaders();
  // Remove Content-Type so the server infers it from the response, not the request
  const { 'Content-Type': _ct, ...blobHeaders } = headers;
  const res = await fetch(path, { method: 'GET', headers: blobHeaders });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  return res.blob();
}
