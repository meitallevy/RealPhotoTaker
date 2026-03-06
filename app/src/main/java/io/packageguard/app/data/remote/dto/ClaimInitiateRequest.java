/**
 * DTO for the request body when a buyer starts a new claim.
 * Carries seller id, order id, device info, and any attestation token.
 */
package io.packageguard.app.data.remote.dto;

public class ClaimInitiateRequest {
    public String sellerId;
    public String orderId;
    public DeviceInfoDto deviceInfo;
    public String attestationToken;
}

