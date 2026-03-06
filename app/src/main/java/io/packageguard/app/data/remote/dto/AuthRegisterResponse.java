/**
 * DTO returned after a successful seller registration.
 * Usually includes the created user and seller ids plus any welcome metadata.
 */
package io.packageguard.app.data.remote.dto;

public class AuthRegisterResponse {
    public String userId;
    public String sellerId;
    public String email;
    public boolean verificationRequired;
}

