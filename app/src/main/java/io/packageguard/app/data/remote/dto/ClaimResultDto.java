package io.packageguard.app.data.remote.dto;

public class ClaimResultDto {
    public boolean valid;
    public int evidenceCount;
    public String manifestHash;
    public String signedAt;
    public String verificationUrl;
    public String pdfReportUrl;
    public boolean sellerNotified;
    public int riskScore;
    public String attestationVerdict;
}
