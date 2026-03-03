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
