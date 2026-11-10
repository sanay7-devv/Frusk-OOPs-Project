package com.iitsm.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import com.iitsm.domain.repository.RefreshTokenRepository;
import com.iitsm.domain.user.RefreshToken;

/** Spring Data implementation of the domain {@link RefreshTokenRepository}. */
public interface JpaRefreshTokenRepository extends JpaRepository<RefreshToken, Long>, RefreshTokenRepository {
}
