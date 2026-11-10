package com.iitsm.web.dto;

import java.util.List;

import com.iitsm.domain.repository.PageSlice;

/** The paging wrapper of every list endpoint (API contract B.1, C.10). page starts at 0. */
public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {

    public static <T> PageResponse<T> of(PageSlice<T> slice) {
        return new PageResponse<>(slice.items(), slice.page(), slice.size(), slice.totalItems(), slice.totalPages());
    }
}
