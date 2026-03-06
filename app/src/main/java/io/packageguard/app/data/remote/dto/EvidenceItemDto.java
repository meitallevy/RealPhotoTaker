/**
 * DTO describing a single piece of photo evidence tied to a claim.
 * Contains identifiers, hashes, and metadata used for verification.
 */
package io.packageguard.app.data.remote.dto;

public class EvidenceItemDto {
    public String evidenceId;
    public String stepId;
    public String capturedAt;
    public String imageUrl;
    public EvidenceMetadataDto metadata;

    public static class EvidenceMetadataDto {
        public String resolution;
        public String mimeType;
    }
}
