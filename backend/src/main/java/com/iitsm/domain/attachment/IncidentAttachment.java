package com.iitsm.domain.attachment;

import java.time.Instant;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * A file attached to an incident (table incident_attachments, handbook Appendix A.3). The bytes live on disk outside
 * the web root; this row keeps the display name, the type found by sniffing, the size and the relative storage path.
 * Never changed once written.
 */
@Entity
@Table(name = "incident_attachments",
        indexes = @Index(name = "idx_incident_attachments_incident", columnList = "incident_id"))
public class IncidentAttachment {

    /** Attachment rules (API Data Dictionary C, Attachment). */
    public static final long MAX_SIZE_BYTES = 5L * 1024 * 1024;
    public static final int MAX_PER_INCIDENT = 10;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    @Column(name = "filename", nullable = false, length = AttachmentName.MAX_LENGTH)
    private String filename;

    @Column(name = "content_type", nullable = false, length = 80)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "storage_path", nullable = false, length = 300)
    private String storagePath;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected IncidentAttachment() {
    }

    public IncidentAttachment(Incident incident, String filename, AttachmentType type, long sizeBytes,
                              String storagePath, User uploadedBy, Instant createdAt) {
        this.incident = incident;
        this.filename = filename;
        this.contentType = type.contentType();
        this.sizeBytes = sizeBytes;
        this.storagePath = storagePath;
        this.uploadedBy = uploadedBy;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public Incident getIncident() {
        return incident;
    }

    public String getFilename() {
        return filename;
    }

    public String getContentType() {
        return contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public String getStoragePath() {
        return storagePath;
    }

    public User getUploadedBy() {
        return uploadedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
