package com.iitsm.domain.attachment;

import java.io.InputStream;
import java.util.Optional;

/**
 * Port for the bytes of attachments (Adapter pattern): the application says "store these bytes for incident 42" and
 * gets back a relative path; where the disk folder is, is an infrastructure detail.
 */
public interface AttachmentStorage {

    /** Stores the bytes under a new random name and returns the relative storage path (e.g. {@code 42/uuid}). */
    String store(Long incidentId, byte[] content);

    /** Opens a stored file; empty when it is missing on disk. */
    Optional<InputStream> open(String storagePath);

    /** Removes a stored file (used when the database insert fails after the file was written). */
    void delete(String storagePath);
}
