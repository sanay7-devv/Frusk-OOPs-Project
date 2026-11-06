package com.iitsm.domain.repository;

import java.util.Optional;

import com.iitsm.domain.user.User;

/**
 * Repository pattern: the domain's view of user storage. It knows nothing about SQL or JPA; the implementation
 * lives in infrastructure.persistence.
 */
public interface UserRepository {

    Optional<User> findById(Long id);

    /** Expects an already normalized (lower-case, trimmed) email. */
    Optional<User> findByEmail(String email);

    Optional<User> findByGoogleSub(String googleSub);

    boolean existsByEmail(String email);

    User save(User user);
}
