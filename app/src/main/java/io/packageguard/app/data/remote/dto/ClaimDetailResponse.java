/**
 * DTO for the full details of a single claim, including items and evidence summary.
 * Used by the seller claim detail screen to render everything in one network call.
 */
package io.packageguard.app.data.remote.dto;

import java.util.List;

public class ClaimDetailResponse {
    public ClaimDetail claim;
    public List<EvidenceItemDto> evidence;

    public static class ClaimDetail {
        public String claimId;
        public String orderId;
        public String status;
        public String submittedAt;
        public String buyerNotes;
        // Seller review fields
        public String sellerViewedAt;
        public String sellerDecision;
        public String sellerNote;
        public String sellerDecidedAt;
    }
}
