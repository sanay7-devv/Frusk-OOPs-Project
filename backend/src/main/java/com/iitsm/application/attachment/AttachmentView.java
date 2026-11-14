package com.iitsm.application.attachment;

import java.time.Instant;

import com.iitsm.domain.attachment.IncidentAttachment;

/** Attachment as the API shows it (API Data Dictionary C): the storage path never leaves the server. */
public record AttachmentView(Long id, Long incidentId, String filename, String contentType, long sizeBytes,
                             UserRef uploadedBy, Instant createdAt) {

    /** UserRef of the contract: id and name only. */
    public record UserRef(Long id, String name) {
    }

    /** Built inside the transaction: reads the uploader and the incident id. */
    static AttachmentView of(IncidentAttachment a) {
        return new AttachmentView(a.getId(), a.getIncident().getId(), a.getFilename(), a.getContentType(),
                a.getSizeBytes(), new UserRef(a.getUploadedBy().getId(), a.getUploadedBy().getName()),
                a.getCreatedAt());
    }
}
