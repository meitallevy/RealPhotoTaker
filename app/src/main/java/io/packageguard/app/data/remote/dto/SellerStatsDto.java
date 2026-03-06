/**
 * DTO representing high-level statistics for a seller shown on the dashboard.
 * Holds simple counts of claims over different time windows.
 */
package io.packageguard.app.data.remote.dto;

public class SellerStatsDto {
    public int totalClaims;
    public int claimsToday;
    public int claimsThisWeek;
    public int claimsThisMonth;
    public int claimsTotal;
}

