package com.iitsm.domain.sla;

import java.time.Duration;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.service.ItService;

import jakarta.persistence.CheckConstraint;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * The response and resolution time promised for one priority (table sla_policies). A policy with no service is the
 * global default for that priority; a service-specific policy overrides it (handbook 1.7).
 */
@Entity
@Table(name = "sla_policies",
        uniqueConstraints = @UniqueConstraint(name = "uk_sla_policies_service_priority",
                columnNames = {"service_id", "priority"}),
        check = @CheckConstraint(name = "ck_sla_policies_resolution_after_response",
                constraint = "resolution_minutes > response_minutes"))
public class SlaPolicy {

    public static final int MAX_RESPONSE_MINUTES = 10_080;    // 7 days
    public static final int MAX_RESOLUTION_MINUTES = 43_200;  // 30 days

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Null = global default for the priority. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private ItService service;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "priority", nullable = false, length = 2)
    private Priority priority;

    @Column(name = "response_minutes", nullable = false)
    private int responseMinutes;

    @Column(name = "resolution_minutes", nullable = false)
    private int resolutionMinutes;

    @Convert(converter = CalendarTypeConverter.class)
    @Column(name = "calendar_type", nullable = false, length = 12)
    private CalendarType calendarType = CalendarType.ALWAYS;

    protected SlaPolicy() {
    }

    public SlaPolicy(ItService service, Priority priority, int responseMinutes, int resolutionMinutes,
                     CalendarType calendarType) {
        this.service = service;
        this.priority = priority;
        changeTargets(responseMinutes, resolutionMinutes, calendarType);
    }

    public Long getId() {
        return id;
    }

    public ItService getService() {
        return service;
    }

    public boolean isGlobalDefault() {
        return service == null;
    }

    public Priority getPriority() {
        return priority;
    }

    public int getResponseMinutes() {
        return responseMinutes;
    }

    public int getResolutionMinutes() {
        return resolutionMinutes;
    }

    public Duration responseTarget() {
        return Duration.ofMinutes(responseMinutes);
    }

    public Duration resolutionTarget() {
        return Duration.ofMinutes(resolutionMinutes);
    }

    public CalendarType getCalendarType() {
        return calendarType;
    }

    /** The targets with the calendar they are counted in, taken from the live settings. */
    public SlaTargets targets(AppSettings settings) {
        return new SlaTargets(responseTarget(), resolutionTarget(), settings.workCalendar(calendarType));
    }

    /** Validates the API Data Dictionary C.9 limits; resolution must be longer than response. */
    public void changeTargets(int newResponseMinutes, int newResolutionMinutes, CalendarType newCalendarType) {
        if (newResponseMinutes < 1 || newResponseMinutes > MAX_RESPONSE_MINUTES) {
            throw new InputValidationException("responseMinutes", "must be between 1 and " + MAX_RESPONSE_MINUTES);
        }
        if (newResolutionMinutes < 1 || newResolutionMinutes > MAX_RESOLUTION_MINUTES) {
            throw new InputValidationException("resolutionMinutes",
                    "must be between 1 and " + MAX_RESOLUTION_MINUTES);
        }
        if (newResolutionMinutes <= newResponseMinutes) {
            throw new InputValidationException("resolutionMinutes", "must be greater than responseMinutes");
        }
        if (newCalendarType == null) {
            throw new InputValidationException("calendarType", "must be ALWAYS or BUSINESS_HOURS");
        }
        this.responseMinutes = newResponseMinutes;
        this.resolutionMinutes = newResolutionMinutes;
        this.calendarType = newCalendarType;
    }
}
