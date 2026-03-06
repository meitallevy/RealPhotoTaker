/**
 * DTO summarizing the outcome of a claim (approved, rejected, etc.).
 * Used to show a concise result to the buyer after processing.
 */
package io.packageguard.app.data.remote.dto;

public class ClaimResultDto {
    public boolean valid;
    public int evidenceCount;
    public String manifestHash;
    public String signedAt;
    public String verificationUrl;
    public String pdfReportUrl;
    public boolean sellerNotified;
}
