package com.iitsm.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import com.iitsm.domain.category.Category;
import com.iitsm.domain.repository.CategoryRepository;

/** Spring Data implementation of the domain {@link CategoryRepository}. */
public interface JpaCategoryRepository extends JpaRepository<Category, Long>, CategoryRepository {
}
