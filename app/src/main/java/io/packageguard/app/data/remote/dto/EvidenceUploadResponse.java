/**
 * DTO representing the backend response after an evidence photo has been uploaded.
 * Usually includes identifiers or confirmation needed to continue the claim flow.
 */
package io.packageguard.app.data.remote.dto;

public class EvidenceUploadResponse {
    public String evidenceId;
    public boolean received;
    public boolean partial;
    public UploadProgressDto uploadProgress;
}
