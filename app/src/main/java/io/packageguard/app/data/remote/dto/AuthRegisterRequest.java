/**
 * DTO for the body of a seller registration request (sign-up form fields).
 */
package io.packageguard.app.data.remote.dto;

public class AuthRegisterRequest {
    public String email;
    public String password;
    public String businessName;
    public String country;
    public String webhookUrl;
}

