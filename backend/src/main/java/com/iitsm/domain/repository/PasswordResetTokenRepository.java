package com.iitsm.domain.repository;

import java.util.List;
import java.util.Optional;

import com.iitsm.domain.user.PasswordResetToken;

/** Persistence port for password reset links (A12). */
public interface PasswordResetTokenRepository {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /** Links of this user that have not been used (they may still be expired). */
    List<PasswordResetToken> findByUser_IdAndUsedAtIsNull(Long userId);

    PasswordResetToken save(PasswordResetToken token);
}
