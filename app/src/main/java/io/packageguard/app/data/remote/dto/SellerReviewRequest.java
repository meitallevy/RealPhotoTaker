package io.packageguard.app.data.remote.dto;

public class SellerReviewRequest {
    public String decision; // APPROVED | REJECTED | MORE_INFO_REQUESTED
    public String note;

    public SellerReviewRequest(String decision, String note) {
        this.decision = decision;
        this.note = note;
    }
}
