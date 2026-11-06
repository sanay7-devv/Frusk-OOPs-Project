package com.iitsm.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.user.User;

/** Spring Data implementation of the domain {@link UserRepository}; the query methods are derived from names. */
public interface JpaUserRepository extends JpaRepository<User, Long>, UserRepository {
}
