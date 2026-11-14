package com.iitsm.web.controller;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.iitsm.application.attachment.AttachmentService;
import com.iitsm.application.attachment.AttachmentView;
import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.domain.attachment.IncidentAttachment;
import com.iitsm.web.openapi.ApiErrors;
import com.iitsm.web.openapi.ErrorCode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Incident attachments (contract B.4, module M14). Participants only; the rules are in {@link AttachmentService}.
 * Downloads are always sent as a download ({@code Content-Disposition: attachment}) with the sniffed type and
 * {@code nosniff}, so an uploaded file is never rendered or run by the browser on the API's origin.
 */
@RestController
@Tag(name = "Incidents")
public class AttachmentController {

    private final AttachmentService attachments;

    public AttachmentController(AttachmentService attachments) {
        this.attachments = attachments;
    }

    @PostMapping(path = "/api/v1/incidents/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('INCIDENT_VIEW_OWN')")
    @Operation(summary = "Upload a file: png, jpg, jpeg, gif, pdf, txt or log by content, at most 5 MB, "
            + "at most 10 per incident (participants)")
    @ApiErrors({ErrorCode.INCIDENT_NOT_FOUND, ErrorCode.RATE_LIMITED})
    public AttachmentView upload(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id,
                                 @RequestPart("file") MultipartFile file) throws IOException {
        if (file.getSize() > IncidentAttachment.MAX_SIZE_BYTES) {
            throw AttachmentService.tooLarge(); // before reading it into memory
        }
        return attachments.upload(caller, id, file.getOriginalFilename(), file.getBytes());
    }

    @GetMapping("/api/v1/incidents/{id}/attachments")
    @PreAuthorize("hasAuthority('INCIDENT_VIEW_OWN')")
    @Operation(summary = "Attachments of an incident, oldest first (participants)")
    @ApiErrors(ErrorCode.INCIDENT_NOT_FOUND)
    public List<AttachmentView> list(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id) {
        return attachments.list(caller, id);
    }

    @GetMapping(path = "/api/v1/attachments/{id}/download",
            produces = {MediaType.APPLICATION_OCTET_STREAM_VALUE, MediaType.APPLICATION_JSON_VALUE})
    @PreAuthorize("hasAuthority('INCIDENT_VIEW_OWN')")
    @Operation(summary = "Download an attachment (participants of its incident)")
    @ApiErrors(ErrorCode.NOT_FOUND)
    public ResponseEntity<InputStreamResource> download(@AuthenticationPrincipal AuthenticatedUser caller,
                                                        @PathVariable Long id) {
        AttachmentService.Download file = attachments.download(caller, id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .contentLength(file.sizeBytes())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(file.filename(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(new InputStreamResource(file.content()));
    }
}
