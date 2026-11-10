package com.iitsm.domain.sla;

/** How SLA minutes are counted: ALWAYS (24/7) or BUSINESS_HOURS (the company calendar in app_config, DEC-39). */
public enum CalendarType {
    ALWAYS,
    BUSINESS_HOURS
}
