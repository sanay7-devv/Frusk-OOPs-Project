package com.iitsm.domain.repository;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentQuery;

/** Filtered, paged, sorted incident list in one query (module M10 extends the filters). */
public interface IncidentSearch {

    PageSlice<Incident> search(IncidentQuery query);
}
