package com.iitsm.application.report;

import com.iitsm.application.report.ReportViews.PostIncidentReport;

/** Port: turns a post-incident report into a PDF document (Adapter pattern; the PDF library lives in infrastructure). */
public interface PostIncidentPdfRenderer {

    byte[] render(PostIncidentReport report);
}
