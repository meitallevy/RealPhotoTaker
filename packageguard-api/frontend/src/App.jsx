/**
 * App.jsx
 *
 * Root component for the PackageGuard Shopify embedded app.
 * Initialises Shopify App Bridge, injects the session token into the API client,
 * and handles navigation between pages.
 *
 * Pages:
 *   dashboard    – seller stats and plan info
 *   claims       – paginated claims list
 *   claimDetail  – full claim detail with review controls
 */

import React, { useEffect, useState } from 'react';
import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider, useAppBridge } from '@shopify/app-bridge-react';
import enTranslations from '@shopify/polaris/locales/en.json';

import { setAppBridge } from './api/client';
import Dashboard from './pages/Dashboard';
import ClaimsList from './pages/ClaimsList';
import ClaimDetail from './pages/ClaimDetail';

// Extract Shopify params from the URL query string
function getShopifyParams () {
  const params = new URLSearchParams(window.location.search);
  return {
    host: params.get('host') || '',
    shop: params.get('shop') || ''
  };
}

/**
 * Inner component — runs inside AppBridgeProvider so useAppBridge() is available.
 */
function AppContent () {
  const app = useAppBridge();
  const [page, setPage] = useState('dashboard');
  const [selectedClaimId, setSelectedClaimId] = useState(null);

  useEffect(() => {
    // Inject App Bridge instance into the API client
    setAppBridge(app);
  }, [app]);

  function handleSelectClaim (claimId) {
    setSelectedClaimId(claimId);
    setPage('claimDetail');
  }

  function handleBackFromDetail () {
    setSelectedClaimId(null);
    setPage('claims');
  }

  return (
    <div>
      {/* Simple tab-style navigation */}
      {page !== 'claimDetail' && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e1e3e5', display: 'flex', gap: 16 }}>
          <button
            onClick={() => setPage('dashboard')}
            style={{
              fontWeight: page === 'dashboard' ? 'bold' : 'normal',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            Dashboard
          </button>
          <button
            onClick={() => setPage('claims')}
            style={{
              fontWeight: page === 'claims' ? 'bold' : 'normal',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            Claims
          </button>
        </div>
      )}

      {page === 'dashboard' && <Dashboard />}
      {page === 'claims' && <ClaimsList onSelectClaim={handleSelectClaim} />}
      {page === 'claimDetail' && (
        <ClaimDetail claimId={selectedClaimId} onBack={handleBackFromDetail} />
      )}
    </div>
  );
}

export default function App () {
  const { host, shop } = getShopifyParams();

  // Store shop on window for the API client to read
  window.shopDomain = shop;

  const config = {
    apiKey: process.env.SHOPIFY_API_KEY || window.__SHOPIFY_API_KEY__ || '',
    host,
    forceRedirect: true
  };

  return (
    <AppProvider i18n={enTranslations}>
      <AppBridgeProvider config={config}>
        <AppContent />
      </AppBridgeProvider>
    </AppProvider>
  );
}
