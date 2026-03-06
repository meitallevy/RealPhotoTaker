/**
 * DTO describing common pagination metadata (page number, page size, total count).
 */
package io.packageguard.app.data.remote.dto;

public class PaginationDto {
    public int page;
    public int limit;
    public int total;
    public boolean hasMore;
}
