package com.iitsm.application.attachment;

import java.io.InputStream;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.incident.IncidentAccessPolicy;
import com.iitsm.domain.attachment.AttachmentName;
import com.iitsm.domain.attachment.AttachmentStorage;
import com.iitsm.domain.attachment.AttachmentType;
import com.iitsm.domain.attachment.IncidentAttachment;
import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.event.IncidentChanged;
import com.iitsm.domain.exception.IncidentNotFoundException;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.ResourceNotFoundException;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.repository.AttachmentRepository;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.user.User;

/**
 * Incident attachments (handbook 2.5 M14, API Data Dictionary C "Attachment"): upload, list, download.
 * <p>
 * Who: the participants of the incident, exactly as for reading it ({@link IncidentAccessPolicy#canView}); everyone
 * else gets 404 INCIDENT_NOT_FOUND, so an attachment never reveals that an incident exists (DEC-21). Rules: type from
 * the first bytes (png, jpg, jpeg, gif, pdf, txt, log) and the name's extension must match it; at most 5 MB; at most
 * 10 per incident; the display name is cleaned and the file on disk has a random name. Every upload is audited as
 * ATTACHMENT_ADDED in the same transaction (handbook 2.10: every state-changing endpoint is audited).
 */
@Service
public class AttachmentService {

    private static final String FIELD = "file";

    private final AttachmentRepository attachments;
    private final IncidentRepository incidents;
    private final UserRepository users;
    private final IncidentAccessPolicy access;
    private final AttachmentStorage storage;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public AttachmentService(AttachmentRepository attachments, IncidentRepository incidents, UserRepository users,
                             IncidentAccessPolicy access, AttachmentStorage storage, ApplicationEventPublisher events,
                             Clock clock) {
        this.attachments = attachments;
        this.incidents = incidents;
        this.users = users;
        this.access = access;
        this.storage = storage;
        this.events = events;
        this.clock = clock;
    }

    /** An open file and what to tell the browser about it. The caller closes the stream. */
    public record Download(String filename, String contentType, long sizeBytes, InputStream content) {
    }

    @Transactional
    public AttachmentView upload(AuthenticatedUser caller, Long incidentId, String originalName, byte[] content) {
        Incident incident = loadVisible(caller, incidentId);
        if (content == null || content.length == 0) {
            throw new InputValidationException(FIELD, "must not be empty");
        }
        if (content.length > IncidentAttachment.MAX_SIZE_BYTES) {
            throw tooLarge();
        }
        if (attachments.countByIncident(incident.getId()) >= IncidentAttachment.MAX_PER_INCIDENT) {
            throw new InputValidationException(FIELD,
                    "this incident already has the maximum of " + IncidentAttachment.MAX_PER_INCIDENT + " attachments");
        }
        AttachmentType type = AttachmentType.sniff(content).orElseThrow(AttachmentService::typeNotAllowed);
        String filename = AttachmentName.sanitize(originalName, "attachment." + type.extensions().get(0));
        if (!type.matchesName(filename)) {
            throw new InputValidationException(FIELD, "the file content is " + type.name().toLowerCase(Locale.ROOT)
                    + " but the name does not end in ." + String.join(" or .", type.extensions()));
        }
        User uploader = users.findById(caller.id()).orElseThrow();
        Instant now = clock.instant();

        String path = storage.store(incident.getId(), content);
        deleteFileIfRolledBack(path);
        IncidentAttachment saved = attachments.save(
                new IncidentAttachment(incident, filename, type, content.length, path, uploader, now));
        events.publishEvent(new IncidentChanged(incident.getId(), incident.getCode(), AuditAction.ATTACHMENT_ADDED,
                caller.id(), incident.getStatus(), incident.getStatus(),
                "Attachment added: " + filename + " (" + type.contentType() + ", " + content.length + " bytes)", now));
        return AttachmentView.of(saved);
    }

    @Transactional(readOnly = true)
    public List<AttachmentView> list(AuthenticatedUser caller, Long incidentId) {
        Incident incident = loadVisible(caller, incidentId);
        return attachments.findByIncident(incident.getId()).stream().map(AttachmentView::of).toList();
    }

    /** 404 NOT_FOUND for an unknown attachment and for one on an incident the caller may not see (no difference). */
    @Transactional(readOnly = true)
    public Download download(AuthenticatedUser caller, Long attachmentId) {
        IncidentAttachment attachment = attachments.findWithIncident(attachmentId)
                .filter(a -> access.canView(caller, a.getIncident()))
                .orElseThrow(() -> new ResourceNotFoundException("Attachment", attachmentId));
        InputStream content = storage.open(attachment.getStoragePath())
                .orElseThrow(() -> new ResourceNotFoundException("Attachment file", attachmentId));
        return new Download(attachment.getFilename(), attachment.getContentType(), attachment.getSizeBytes(), content);
    }

    // ------------------------------------------------------------------ helpers

    private Incident loadVisible(AuthenticatedUser caller, Long incidentId) {
        return incidents.findById(incidentId)
                .filter(i -> access.canView(caller, i))
                .orElseThrow(() -> new IncidentNotFoundException(incidentId));
    }

    /** The file is written before the row; if the transaction then rolls back, the orphan file is removed. */
    private void deleteFileIfRolledBack(String path) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) {
                        storage.delete(path);
                    }
                }
            });
        }
    }

    public static InputValidationException tooLarge() {
        return new InputValidationException(FIELD,
                "must be at most " + IncidentAttachment.MAX_SIZE_BYTES / (1024 * 1024) + " MB");
    }

    private static InputValidationException typeNotAllowed() {
        return new InputValidationException(FIELD,
                "type is not allowed; allowed: " + String.join(", ", AttachmentType.allowedExtensions()));
    }
}
