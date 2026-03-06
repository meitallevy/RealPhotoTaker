/**
 * Plain data holder (DTO) for the response when a buyer starts a new claim.
 * Includes the generated claim id, nonce, server time, and any existing-claim shortcuts.
 */
package io.packageguard.app.data.remote.dto;

public class ClaimInitiateResponse {
    public String claimId;
    public String nonce;
    public String nonceExpiresAt;
    public String serverTime;
    // Buyer already has an active / completed claim for this order
    public boolean alreadyOpen;
    public String status;           // current status when alreadyOpen=true
    public String verificationUrl;  // non-null when status=COMPLETED
    // Seller requested additional evidence on a prior claim
    public boolean moreInfoRequested;
    public String sellerNote;
    public String uploadEndpoint;
    public UploadConfigDto uploadConfig;
}

