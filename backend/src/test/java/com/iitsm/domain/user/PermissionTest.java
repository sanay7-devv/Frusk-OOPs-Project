package com.iitsm.domain.user;

import static org.junit.jupiter.api.Assertions.*;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class PermissionTest {
    private static final Instant NOW = Instant.parse("2026-11-19T00:00:00Z");

    @Test void technician_keeps_employee_permissions_and_lead_gains_team_actions() {
        var user = new UserFactory(Clock.fixed(NOW, ZoneOffset.UTC))
                .newEmployee("Test User", "TEST@IITSM.DEMO", "hash", "IT");
        assertEquals("test@iitsm.demo", user.getEmail());
        assertTrue(user.can(PermissionKey.INCIDENT_CREATE));
        assertFalse(user.can(PermissionKey.INCIDENT_HANDLE));

        user.grantTechnicianRole(NOW, 3, 1, 10);
        assertTrue(user.can(PermissionKey.INCIDENT_CREATE));
        assertTrue(user.can(PermissionKey.INCIDENT_HANDLE));
        assertTrue(user.can(PermissionKey.INCIDENT_VIEW_TEAM));
        assertTrue(user.can(PermissionKey.INCIDENT_ASSIGN));
        assertFalse(user.can(PermissionKey.USER_MANAGE));
        assertEquals(2, user.getRoleTypes().size());
    }

    @Test void administrator_permissions_form_union_without_accidental_handle_right() {
        var user = new UserFactory(Clock.fixed(NOW, ZoneOffset.UTC))
                .newEmployee("Admin", "admin@iitsm.demo", "hash", "IT");
        user.grantAdministratorRole(NOW, AdminScope.SYSTEM_ADMIN);
        assertTrue(user.can(PermissionKey.INCIDENT_CREATE));
        assertTrue(user.can(PermissionKey.REPORT_VIEW));
        assertTrue(user.can(PermissionKey.AUDIT_VIEW));
        assertFalse(user.can(PermissionKey.INCIDENT_HANDLE));
        assertEquals(2, user.getRoleTypes().size());
    }
}
