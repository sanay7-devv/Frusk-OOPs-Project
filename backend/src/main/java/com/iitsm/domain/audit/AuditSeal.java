package com.iitsm.domain.audit;

import java.time.Instant;

import org.hibernate.annotations.Immutable;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * One seal over a batch of audit records (table audit_seals, S3, DEC-44): the id range, how many records it covers,
 * its own hash and the hash of the seal before it. Never changed after it is written.
 */
@Entity
@Immutable
@Table(name = "audit_seals")
public class AuditSeal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "from_id", nullable = false)
    private long fromId;

    @Column(name = "to_id", nullable = false)
    private long toId;

    @Column(name = "record_count", nullable = false)
    private int recordCount;

    @Column(name = "hash", nullable = false, length = 64)
    private String hash;

    @Column(name = "prev_hash", nullable = false, length = 64)
    private String prevHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AuditSeal() {
    }

    public AuditSeal(long fromId, long toId, int recordCount, String hash, String prevHash, Instant createdAt) {
        this.fromId = fromId;
        this.toId = toId;
        this.recordCount = recordCount;
        this.hash = hash;
        this.prevHash = prevHash;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public long getFromId() {
        return fromId;
    }

    public long getToId() {
        return toId;
    }

    public int getRecordCount() {
        return recordCount;
    }

    public String getHash() {
        return hash;
    }

    public String getPrevHash() {
        return prevHash;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
