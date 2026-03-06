/**
 * DTO wrapping a page of claims for a seller, often combined with pagination info.
 */
package io.packageguard.app.data.remote.dto;

import java.util.List;

public class SellerClaimsListResponse {
    public List<ClaimItemDto> claims;
    public PaginationDto pagination;
}
