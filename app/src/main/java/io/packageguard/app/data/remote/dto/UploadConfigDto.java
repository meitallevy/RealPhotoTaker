/**
 * DTO describing how uploads should behave for a given claim.
 * Carries server-side limits like max photos, size, or timeouts so the client can enforce them.
 */
package io.packageguard.app.data.remote.dto;

public class UploadConfigDto {
    public long chunkSizeBytes;
    public int maxConcurrentUploads;
    public boolean resumable;
}

