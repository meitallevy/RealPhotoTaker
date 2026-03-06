/**
 * DTO containing the server's response after a seller reviews a claim.
 * Indicates the final decision and any notes that should be shown to the buyer.
 */
package io.packageguard.app.data.remote.dto;

public class SellerReviewResponse {
    public boolean updated;
    public String decision;
    public String note;
    public String decidedAt;
}
