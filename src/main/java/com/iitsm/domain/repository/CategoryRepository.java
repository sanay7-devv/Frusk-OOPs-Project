package com.iitsm.domain.repository;

import java.util.List;
import java.util.Optional;

import com.iitsm.domain.category.Category;

/** Repository pattern: storage of incident categories. */
public interface CategoryRepository {

    Optional<Category> findById(Long id);

    List<Category> findAllByOrderByNameAsc();

    List<Category> findByActiveTrueOrderByNameAsc();

    Category save(Category category);
}
