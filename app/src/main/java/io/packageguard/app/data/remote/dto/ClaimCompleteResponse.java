/**
 * DTO representing the server response when a buyer finishes uploading all evidence.
 */
package io.packageguard.app.data.remote.dto;

public class ClaimCompleteResponse {
    public String claimId;
    public String status;
    public int estimatedProcessingTime;
    public String statusCheckEndpoint;
}
