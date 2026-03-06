/**
 * DTO for the current status of a claim as returned to the buyer.
 */
package io.packageguard.app.data.remote.dto;

public class ClaimStatusResponse {
    public String claimId;
    public String status;
    public String sellerDecision;
    public String sellerNote;
    public String verificationUrl;
    public ClaimResultDto result;
}
