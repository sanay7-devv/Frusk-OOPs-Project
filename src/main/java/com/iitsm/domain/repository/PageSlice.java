package com.iitsm.domain.repository;

import java.util.List;
import java.util.function.Function;

/** One page of results plus the total count, free of Spring types (API contract B.1 paging). */
public record PageSlice<T>(List<T> items, int page, int size, long totalItems) {

    public int totalPages() {
        return size == 0 ? 0 : (int) ((totalItems + size - 1) / size);
    }

    public <R> PageSlice<R> map(Function<T, R> mapper) {
        return new PageSlice<>(items.stream().map(mapper).toList(), page, size, totalItems);
    }
}
