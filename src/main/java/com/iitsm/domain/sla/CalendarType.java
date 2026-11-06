package com.iitsm.domain.sla;

/** How SLA minutes are counted. Only ALWAYS (24/7) is built; BUSINESS_HOURS is Tier 3 (handbook 2.5 M7). */
public enum CalendarType {
    ALWAYS,
    BUSINESS_HOURS
}
