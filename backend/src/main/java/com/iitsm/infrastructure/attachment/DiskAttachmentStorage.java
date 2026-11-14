package com.iitsm.infrastructure.attachment;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.iitsm.domain.attachment.AttachmentStorage;

/**
 * Adapter: attachments as files in one folder outside the web root ({@code app.attachments.dir}, env
 * {@code ATTACHMENTS_DIR}). Layout {@code <dir>/<incidentId>/<random UUID>}: no extension and no user text in the
 * path, so a file can never be executed or served by name, and "../" in an upload name cannot reach the disk. Every
 * resolved path is checked to stay inside the folder.
 */
@Component
public class DiskAttachmentStorage implements AttachmentStorage {

    private static final Logger log = LoggerFactory.getLogger(DiskAttachmentStorage.class);

    private final Path root;

    public DiskAttachmentStorage(@Value("${app.attachments.dir}") String dir) throws IOException {
        this.root = Path.of(dir).toAbsolutePath().normalize();
        Files.createDirectories(root);
        log.info("Attachments are stored in {}", root);
    }

    @Override
    public String store(Long incidentId, byte[] content) {
        String relative = incidentId + "/" + UUID.randomUUID();
        Path target = resolve(relative);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, content, StandardOpenOption.CREATE_NEW);
            return relative;
        } catch (IOException ex) {
            throw new UncheckedIOException("Could not store an attachment for incident " + incidentId, ex);
        }
    }

    @Override
    public Optional<InputStream> open(String storagePath) {
        try {
            return Optional.of(Files.newInputStream(resolve(storagePath)));
        } catch (NoSuchFileException ex) {
            return Optional.empty();
        } catch (IOException ex) {
            throw new UncheckedIOException("Could not read attachment " + storagePath, ex);
        }
    }

    @Override
    public void delete(String storagePath) {
        try {
            Files.deleteIfExists(resolve(storagePath));
        } catch (IOException ex) {
            log.warn("Could not delete attachment file {}: {}", storagePath, ex.toString());
        }
    }

    private Path resolve(String relative) {
        Path path = root.resolve(relative).normalize();
        if (!path.startsWith(root)) {
            throw new IllegalArgumentException("Attachment path escapes the storage folder: " + relative);
        }
        return path;
    }
}
