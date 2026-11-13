package com.iitsm.infrastructure.report;

import java.io.ByteArrayOutputStream;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Element;
import org.openpdf.text.Font;
import org.openpdf.text.FontFactory;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import org.springframework.stereotype.Component;

import com.iitsm.application.incident.IncidentViews.Ref;
import com.iitsm.application.report.PostIncidentPdfRenderer;
import com.iitsm.application.report.ReportViews.PostIncidentReport;
import com.iitsm.application.report.ReportViews.SlaOutcome;

/** Draws the post-incident report with OpenPDF (decision DEC-64): a title block, summary tables and the timeline. */
@Component
public class OpenPdfPostIncidentRenderer implements PostIncidentPdfRenderer {

    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss 'UTC'")
            .withZone(ZoneOffset.UTC);
    private static final Font TITLE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
    private static final Font HEADING = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
    private static final Font BODY = FontFactory.getFont(FontFactory.HELVETICA, 9);
    private static final Font BOLD = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);

    @Override
    public byte[] render(PostIncidentReport r) {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 36, 36);
        try {
            PdfWriter.getInstance(document, bytes);
            document.open();
            document.add(new Paragraph("Post-incident report: " + r.code(), TITLE));
            document.add(new Paragraph(r.title(), BODY));
            document.add(new Paragraph("Generated " + STAMP.format(r.generatedAt())
                    + (r.complete() ? "" : " (the incident is still open: a report so far)"), BODY));

            heading(document, "Summary");
            PdfPTable summary = table(2, 25, 75);
            row(summary, "Status", r.status().name());
            row(summary, "Priority", r.priority() == null ? "-" : r.priority().name());
            row(summary, "Service", r.service().name());
            row(summary, "Category", r.category() == null ? "-" : r.category().name());
            row(summary, "Created", STAMP.format(r.createdAt()));
            row(summary, "Resolved", r.resolvedAt() == null ? "-" : STAMP.format(r.resolvedAt()));
            row(summary, "Closed", r.closedAt() == null ? "-" : STAMP.format(r.closedAt()));
            row(summary, "Reopened", r.reopenCount() + " time(s)");
            row(summary, "Total time", duration(r.totalSeconds()));
            row(summary, "Satisfaction", r.satisfaction() == null ? "no rating" : r.satisfaction() + " / 5");
            document.add(summary);

            heading(document, "SLA outcome");
            SlaOutcome sla = r.sla();
            PdfPTable slaTable = table(2, 25, 75);
            row(slaTable, "Outcome", sla.outcome());
            row(slaTable, "Response", clock("due", sla.responseDue(), "acknowledged", sla.acknowledgedAt(),
                    sla.responseMet()));
            row(slaTable, "Resolution", clock("due", sla.resolutionDue(), "resolved", sla.resolvedAt(),
                    sla.resolutionMet()));
            sla.violations().forEach(v -> row(slaTable, "Violation", v.clock() + ", " + duration(v.overdueSeconds())
                    + " late, noticed " + STAMP.format(v.recordedAt())
                    + (v.technician() == null ? "" : ", assignee " + v.technician().name())));
            document.add(slaTable);

            heading(document, "Time in each status");
            PdfPTable stay = table(3, 50, 30, 20);
            header(stay, "Status", "Time", "Visits");
            r.timeInStatus().forEach(s -> {
                cell(stay, s.status().name() + (s.stillIn() ? " (now)" : ""), BODY);
                cell(stay, s.status().name().equals("CLOSED") ? "final" : duration(s.seconds()), BODY);
                cell(stay, String.valueOf(s.visits()), BODY);
            });
            document.add(stay);

            heading(document, "People involved");
            PdfPTable people = table(3, 40, 40, 20);
            header(people, "Name", "Role", "Actions");
            r.people().forEach(p -> {
                cell(people, p.person().name(), BODY);
                cell(people, String.join(", ", p.roles()), BODY);
                cell(people, String.valueOf(p.actions()), BODY);
            });
            document.add(people);

            if (r.resolution() != null) {
                heading(document, "Resolution");
                PdfPTable res = table(2, 25, 75);
                row(res, "Root cause", r.resolution().rootCause());
                row(res, "Notes", r.resolution().notes());
                row(res, "Steps", r.resolution().steps() == null ? "-" : r.resolution().steps());
                row(res, "Time spent", r.resolution().timeSpentMinutes() + " minutes of work");
                document.add(res);
            }

            heading(document, "Timeline");
            PdfPTable timeline = table(4, 22, 18, 18, 42);
            header(timeline, "When", "Who", "Action", "Detail");
            r.timeline().forEach(t -> {
                cell(timeline, STAMP.format(t.at()), BODY);
                cell(timeline, name(t.actor()), BODY);
                cell(timeline, t.action() + (t.to() == null ? "" : " (" + (t.from() == null ? "" : t.from() + " to ")
                        + t.to() + ")"), BODY);
                cell(timeline, t.description(), BODY);
            });
            document.add(timeline);
        } catch (DocumentException ex) {
            throw new IllegalStateException("Could not build the post-incident PDF", ex);
        } finally {
            document.close();
        }
        return bytes.toByteArray();
    }

    private static void heading(Document document, String text) throws DocumentException {
        Paragraph p = new Paragraph(text, HEADING);
        p.setSpacingBefore(10);
        p.setSpacingAfter(4);
        document.add(p);
    }

    private static PdfPTable table(int columns, float... widths) throws DocumentException {
        PdfPTable table = new PdfPTable(columns);
        table.setWidthPercentage(100);
        table.setWidths(widths);
        return table;
    }

    private static void header(PdfPTable table, String... names) {
        for (String name : names) {
            PdfPCell cell = new PdfPCell(new Phrase(name, BOLD));
            cell.setBackgroundColor(new java.awt.Color(230, 230, 230));
            table.addCell(cell);
        }
    }

    private static void row(PdfPTable table, String label, String value) {
        cell(table, label, BOLD);
        cell(table, value == null ? "-" : value, BODY);
    }

    private static void cell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text == null ? "" : text, font));
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.addCell(cell);
    }

    private static String clock(String dueLabel, Instant due, String doneLabel, Instant done, Boolean met) {
        String result = due == null ? "no deadline" : dueLabel + " " + STAMP.format(due);
        if (done != null) {
            result += ", " + doneLabel + " " + STAMP.format(done);
        }
        return result + (met == null ? ", still running" : met ? ", met" : ", missed");
    }

    private static String name(Ref ref) {
        return ref == null ? "System" : ref.name();
    }

    static String duration(long seconds) {
        Duration d = Duration.ofSeconds(seconds);
        long days = d.toDays();
        return (days > 0 ? days + "d " : "") + d.toHoursPart() + "h " + d.toMinutesPart() + "m " + d.toSecondsPart() + "s";
    }
}
