package com.iitsm.domain.repository;

import java.util.List;
import java.util.Optional;

import com.iitsm.domain.user.RefreshToken;

/** Repository pattern: storage of refresh tokens (hashes only). */
public interface RefreshTokenRepository {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    List<RefreshToken> findByUser_IdAndRevokedFalse(Long userId);

    RefreshToken save(RefreshToken token);
}
