package io.packageguard.app.data.remote.dto;

public class ClaimInitiateResponse {
    public String claimId;
    public String nonce;
    public String nonceExpiresAt;
    public String serverTime;
    public boolean moreInfoRequested;
    public String sellerNote;
    public String uploadEndpoint;
    public UploadConfigDto uploadConfig;
}

