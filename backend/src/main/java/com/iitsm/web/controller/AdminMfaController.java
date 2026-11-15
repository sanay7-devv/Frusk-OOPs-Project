package com.iitsm.web.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.auth.MfaService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Lets an administrator turn off someone's two-step verification after a lost phone (A12). Needs USER_MANAGE. */
@RestController
@RequestMapping("/api/v1/admin/users/{id}/mfa")
@PreAuthorize("hasAuthority('USER_MANAGE')")
@Tag(name = "Admin: users")
public class AdminMfaController {

    private final MfaService mfa;

    public AdminMfaController(MfaService mfa) {
        this.mfa = mfa;
    }

    @PostMapping("/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Turn off a user's two-step verification (lost phone); audited as MFA_DISABLED")
    public void reset(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id) {
        mfa.adminReset(caller.id(), id);
    }
}
