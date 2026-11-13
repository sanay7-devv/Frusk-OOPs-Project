package com.iitsm.domain.repository;

import java.util.List;
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

    List<User> findAllByOrderByNameAsc();

    /** Every user holding the TECHNICIAN role (team leads included), active or not. */
    List<User> findAllTechnicians();

    /** Every user holding the ADMINISTRATOR role, active or not (notifications, escalation levels 2 and 3). */
    List<User> findAllAdministrators();

    User save(User user);
}
