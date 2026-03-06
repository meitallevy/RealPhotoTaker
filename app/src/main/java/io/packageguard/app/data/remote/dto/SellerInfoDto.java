/**
 * DTO describing basic seller information returned from the backend.
 * Used to populate seller profile and dashboard screens.
 */
package io.packageguard.app.data.remote.dto;

public class SellerInfoDto {
    public String sellerId;
    public String businessName;
    public String email;
    public boolean verified;
    public String createdAt;
    public String plan;
}

