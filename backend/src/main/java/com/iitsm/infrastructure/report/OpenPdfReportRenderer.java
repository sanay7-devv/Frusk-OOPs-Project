package com.iitsm.infrastructure.report;

import java.io.ByteArrayOutputStream;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Font;
import org.openpdf.text.FontFactory;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import org.springframework.stereotype.Component;

import com.iitsm.application.report.ReportPdfRenderer;

/** Draws an export table with OpenPDF (landscape A4, header row repeated on every page), styled like the post-incident PDF. */
@Component
public class OpenPdfReportRenderer implements ReportPdfRenderer {

    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss 'UTC'")
            .withZone(ZoneOffset.UTC);
    private static final Font TITLE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
    private static final Font BODY = FontFactory.getFont(FontFactory.HELVETICA, 8);
    private static final Font BOLD = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8);

    @Override
    public byte[] render(ReportDocument report) {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4.rotate(), 36, 36, 36, 36);
        try {
            PdfWriter.getInstance(document, bytes);
            document.open();
            document.add(new Paragraph(report.title(), TITLE));
            document.add(new Paragraph("Range: " + (report.from() == null ? "start" : STAMP.format(report.from()))
                    + " to " + (report.to() == null ? "now" : STAMP.format(report.to())), BODY));
            document.add(new Paragraph("Generated " + STAMP.format(report.generatedAt()) + ", "
                    + report.rows().size() + " row(s)"
                    + (report.capped() ? " (capped by the export row limit)" : ""), BODY));

            List<String> headers = report.headers();
            PdfPTable table = new PdfPTable(headers.size());
            table.setWidthPercentage(100);
            table.setSpacingBefore(8);
            table.setHeaderRows(1);
            for (String name : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(name, BOLD));
                cell.setBackgroundColor(new java.awt.Color(230, 230, 230));
                table.addCell(cell);
            }
            for (List<String> row : report.rows()) {
                for (String value : row) {
                    table.addCell(new PdfPCell(new Phrase(value == null ? "" : value, BODY)));
                }
            }
            document.add(table);
        } catch (DocumentException ex) {
            throw new IllegalStateException("Could not build the report PDF", ex);
        } finally {
            document.close();
        }
        return bytes.toByteArray();
    }
}
