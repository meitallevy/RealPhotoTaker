/**
 * DTO returned after a successful login.
 * Includes access/refresh tokens and basic user info for the seller.
 */
package io.packageguard.app.data.remote.dto;

public class AuthLoginResponse {
    public String accessToken;
    public String refreshToken;
    public long expiresIn;
    public AuthUserInfo user;
}

