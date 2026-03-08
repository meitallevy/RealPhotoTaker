/**
 * ClaimDetail.jsx
 *
 * Full claim detail with evidence photos and seller review controls.
 * Calls GET /v1/seller/claims/:claimId and PATCH /v1/seller/claims/:claimId/review
 * (same endpoints as Android app).
 *
 * Evidence images are fetched with Authorization headers via AuthenticatedImage
 * because <img src> cannot attach headers on its own.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineGrid,
  Badge,
  Button,
  ButtonGroup,
  TextField,
  Banner,
  Spinner
} from '@shopify/polaris';
import { apiGet, apiPatch, fetchBlob } from '../api/client';

const STATUS_TONE = {
  PENDING: 'attention',
  COMPLETED: 'success',
  APPROVED: 'success',
  REJECTED: 'critical',
  MORE_INFO_REQUESTED: 'warning'
};

/**
 * Fetches an image URL using the authenticated API client and renders it.
 * Revokes the object URL on unmount to avoid memory leaks.
 */
function AuthenticatedImage ({ url, alt }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const prevUrl = useRef(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    fetchBlob(url)
      .then(blob => {
        if (cancelled) return;
        const objUrl = URL.createObjectURL(blob);
        if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
        prevUrl.current = objUrl;
        setObjectUrl(objUrl);
      })
      .catch(() => {
        // Image load failed silently — evidence may not exist yet
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    return () => {
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    };
  }, []);

  if (!objectUrl) {
    return (
      <div style={{ width: 100, height: 100, background: '#f4f6f8', borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="small" accessibilityLabel="Loading image" />
      </div>
    );
  }

  return (
    <img
      src={objectUrl}
      alt={alt}
      style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4 }}
    />
  );
}

export default function ClaimDetail ({ claimId, onBack }) {
  const [claim, setClaim] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    apiGet(`/v1/seller/claims/${claimId}`)
      .then(data => {
        setClaim(data.claim);
        setEvidence(data.evidence || []);
      })
      .catch(err => setError(err.message));
  }, [claimId]);

  async function submitDecision (decision) {
    setSubmitting(true);
    setError(null);
    try {
      await apiPatch(`/v1/seller/claims/${claimId}/review`, { decision, note });
      setSuccess(`Claim ${decision.toLowerCase().replace(/_/g, ' ')}.`);
      setClaim(prev => ({ ...prev, status: decision, sellerNote: note }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !claim) {
    return (
      <Page title="Claim Detail" backAction={{ onAction: onBack }}>
        <Banner status="critical">{error}</Banner>
      </Page>
    );
  }

  if (!claim) {
    return (
      <Page title="Claim Detail" backAction={{ onAction: onBack }}>
        <Spinner accessibilityLabel="Loading claim" />
      </Page>
    );
  }

  return (
    <Page
      title={`Claim ${claim.claimId}`}
      backAction={{ onAction: onBack }}
    >
      <BlockStack gap="400">
        {error && <Banner status="critical">{error}</Banner>}
        {success && <Banner status="success">{success}</Banner>}

        <Card>
          <BlockStack gap="200">
            <Text variant="headingMd">Details</Text>
            <InlineGrid columns={2} gap="200">
              <Text>Status: <Badge tone={STATUS_TONE[claim.status] || 'info'}>{claim.status}</Badge></Text>
              <Text>Order ID: {claim.orderId || '—'}</Text>
              <Text>Submitted: {new Date(claim.submittedAt).toLocaleString()}</Text>
            </InlineGrid>
            {claim.buyerNotes && <Text>Buyer notes: {claim.buyerNotes}</Text>}
            {claim.sellerNote && <Text>Seller note: {claim.sellerNote}</Text>}
          </BlockStack>
        </Card>

        {evidence.length > 0 && (
          <Card>
            <BlockStack gap="200">
              <Text variant="headingMd">Evidence Photos</Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {evidence.map(ev => (
                  <AuthenticatedImage
                    key={ev.evidenceId}
                    url={ev.imageUrl}
                    alt={ev.stepId || 'Evidence photo'}
                  />
                ))}
              </div>
            </BlockStack>
          </Card>
        )}

        {claim.status === 'PENDING' && (
          <Card>
            <BlockStack gap="200">
              <Text variant="headingMd">Review</Text>
              <TextField
                label="Note (optional)"
                value={note}
                onChange={setNote}
                multiline={3}
                placeholder="Add a note for the buyer..."
              />
              <ButtonGroup>
                <Button
                  variant="primary"
                  tone="success"
                  loading={submitting}
                  onClick={() => submitDecision('APPROVED')}
                >
                  Approve
                </Button>
                <Button
                  variant="primary"
                  tone="critical"
                  loading={submitting}
                  onClick={() => submitDecision('REJECTED')}
                >
                  Reject
                </Button>
                <Button
                  loading={submitting}
                  onClick={() => submitDecision('MORE_INFO_REQUESTED')}
                >
                  Request More Info
                </Button>
              </ButtonGroup>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
