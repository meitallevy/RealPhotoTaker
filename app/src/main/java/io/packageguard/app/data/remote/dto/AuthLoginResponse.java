package io.packageguard.app.data.remote.dto;

public class AuthLoginResponse {
    public String accessToken;
    public String refreshToken;
    public long expiresIn;
    public AuthUserInfo user;
}

