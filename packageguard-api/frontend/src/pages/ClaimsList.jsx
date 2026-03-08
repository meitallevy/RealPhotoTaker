/**
 * ClaimsList.jsx
 *
 * Paginated claims list — calls GET /v1/seller/claims (same endpoint as Android).
 */

import React, { useEffect, useState } from 'react';
import {
  Page,
  Card,
  DataTable,
  Badge,
  Button,
  Banner,
  Spinner,
  Pagination
} from '@shopify/polaris';
import { apiGet } from '../api/client';

const STATUS_TONE = {
  PENDING: 'attention',
  APPROVED: 'success',
  REJECTED: 'critical',
  MORE_INFO_REQUESTED: 'warning'
};

export default function ClaimsList ({ onSelectClaim }) {
  const [claims, setClaims] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiGet(`/v1/seller/claims?page=${page}&limit=20`)
      .then(data => {
        setClaims(data.claims || []);
        setHasNext(data.pagination ? data.pagination.page < data.pagination.pages : false);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [page]);

  if (error) {
    return (
      <Page title="Claims">
        <Banner status="critical">{error}</Banner>
      </Page>
    );
  }

  const rows = claims.map(c => [
    c.claimId,
    c.orderId || '—',
    c.buyerName || '—',
    <Badge tone={STATUS_TONE[c.status] || 'info'}>{c.status}</Badge>,
    new Date(c.createdAt).toLocaleDateString(),
    <Button size="slim" onClick={() => onSelectClaim(c.claimId)}>View</Button>
  ]);

  return (
    <Page title="Claims">
      {loading
        ? <Spinner accessibilityLabel="Loading claims" />
        : (
          <Card>
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
              headings={['Claim ID', 'Order ID', 'Buyer', 'Status', 'Date', '']}
              rows={rows}
              footerContent={`Page ${page}`}
            />
            <Pagination
              hasPrevious={page > 1}
              onPrevious={() => setPage(p => p - 1)}
              hasNext={hasNext}
              onNext={() => setPage(p => p + 1)}
            />
          </Card>
        )}
    </Page>
  );
}
