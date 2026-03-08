/**
 * Dashboard.jsx
 *
 * Seller dashboard page — calls GET /v1/seller/dashboard (same endpoint as Android).
 * Displays plan info, claim counts, and the seller ID for buyer QR code / deep links.
 */

import React, { useEffect, useState } from 'react';
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineGrid,
  Badge,
  Banner,
  Spinner
} from '@shopify/polaris';
import { apiGet } from '../api/client';

export default function Dashboard () {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/v1/seller/dashboard')
      .then(setData)
      .catch(err => setError(err.message));
  }, []);

  if (error) {
    return (
      <Page title="Dashboard">
        <Banner status="critical">{error}</Banner>
      </Page>
    );
  }

  if (!data) {
    return (
      <Page title="Dashboard">
        <Spinner accessibilityLabel="Loading" size="large" />
      </Page>
    );
  }

  const { seller, plan, counts } = data;

  return (
    <Page title="PackageGuard Dashboard">
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="200">
            <Text variant="headingMd">Account</Text>
            <Text>Business: {seller.businessName}</Text>
            <Text>Email: {seller.email}</Text>
            <Text>Seller ID: <strong>{seller.sellerId}</strong></Text>
            <Text variant="bodySm" tone="subdued">
              Share this ID with buyers so they can submit claims.
            </Text>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text variant="headingMd">Plan</Text>
            <InlineGrid columns={2} gap="200">
              <Text>Plan: <Badge>{plan.name}</Badge></Text>
              <Text>Claims today: {counts.today} / {plan.dailyLimit}</Text>
              <Text>Claims this month: {counts.month} / {plan.monthlyLimit}</Text>
              <Text>Claims total: {counts.total} / {plan.totalLimit}</Text>
            </InlineGrid>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
