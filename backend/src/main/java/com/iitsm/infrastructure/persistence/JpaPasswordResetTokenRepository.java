package com.iitsm.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import com.iitsm.domain.repository.PasswordResetTokenRepository;
import com.iitsm.domain.user.PasswordResetToken;

/** Spring Data implementation of the domain {@link PasswordResetTokenRepository}. */
public interface JpaPasswordResetTokenRepository
        extends JpaRepository<PasswordResetToken, Long>, PasswordResetTokenRepository {
}
