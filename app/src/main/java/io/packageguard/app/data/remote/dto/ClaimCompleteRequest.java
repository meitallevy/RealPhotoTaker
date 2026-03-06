/**
 * DTO for the payload sent when the buyer taps \"complete\" after all evidence uploads.
 * Typically carries counts and optional notes, not the raw image bytes themselves.
 */
package io.packageguard.app.data.remote.dto;

public class ClaimCompleteRequest {
    public int totalEvidenceCount;
    public String buyerNotes;
    public String attestationToken;
}
