/**
 * DTO wrapping all data needed to render the seller dashboard in one response.
 * Typically combines stats, recent claims, and other high-level info.
 */
package io.packageguard.app.data.remote.dto;

public class SellerDashboardResponse {
    public SellerInfoDto seller;
    public SellerStatsDto stats;
    public QrCodeDto qrCode;
}

