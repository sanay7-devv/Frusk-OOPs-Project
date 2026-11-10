package com.iitsm.domain.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

/** Administrator-only data (table administrator_profiles, keyed by the user id). */
@Entity
@Table(name = "administrator_profiles")
public class AdministratorProfile {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false, length = 20)
    private AdminScope scope;

    protected AdministratorProfile() {
    }

    AdministratorProfile(User user, AdminScope scope) {
        this.user = user;
        this.scope = scope;
    }

    public AdminScope getScope() {
        return scope;
    }

    public void changeScope(AdminScope newScope) {
        this.scope = newScope;
    }
}
