package com.iitsm.web.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.audit.AuditSealService;
import com.iitsm.application.audit.AuditSealService.SealView;
import com.iitsm.application.audit.AuditSealService.VerifyView;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/** The sealed audit trail for administrators (S3, DEC-44): prove the log is intact, or seal it right now. */
@RestController
@RequestMapping("/api/v1/audit")
@Tag(name = "Audit")
public class AuditSealController {

    private final AuditSealService seals;

    public AuditSealController(AuditSealService seals) {
        this.seals = seals;
    }

    @GetMapping("/verify")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    @Operation(summary = "Verify the sealed audit trail; names the first altered record or seal (admin)")
    public VerifyView verify() {
        return seals.verify();
    }

    @PostMapping("/seal")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    @Operation(summary = "Seal the audit records written since the last seal now (admin); 204 if there is nothing new")
    public ResponseEntity<SealView> sealNow() {
        return seals.seal(false).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }
}
