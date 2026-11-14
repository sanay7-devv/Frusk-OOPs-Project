package com.iitsm.domain.audit;

import org.hibernate.annotations.Immutable;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/**
 * The digest of one audit record at the moment it was sealed (table audit_seal_entries, DEC-91). It lets verification
 * name the exact record that changed, not just the batch. A record belongs to one seal only, so its id is the key.
 */
@Entity
@Immutable
@Table(name = "audit_seal_entries", indexes = @Index(name = "idx_audit_seal_entries_seal", columnList = "seal_id"))
public class AuditSealEntry {

    @Id
    @Column(name = "record_id")
    private Long recordId;

    @Column(name = "seal_id", nullable = false)
    private Long sealId;

    @Column(name = "digest", nullable = false, length = 64)
    private String digest;

    protected AuditSealEntry() {
    }

    public AuditSealEntry(Long recordId, Long sealId, String digest) {
        this.recordId = recordId;
        this.sealId = sealId;
        this.digest = digest;
    }

    public Long getRecordId() {
        return recordId;
    }

    public Long getSealId() {
        return sealId;
    }

    public String getDigest() {
        return digest;
    }
}
