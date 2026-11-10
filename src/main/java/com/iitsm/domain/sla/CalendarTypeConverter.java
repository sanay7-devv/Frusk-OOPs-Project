package com.iitsm.domain.sla;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Stores {@link CalendarType} in sla_policies.calendar_type, which Appendix A sizes VARCHAR(12): BUSINESS_HOURS
 * (14 characters) is written as BUSINESS_HRS. The API keeps the contract value BUSINESS_HOURS (ERROR_LOG E-022).
 */
@Converter
public class CalendarTypeConverter implements AttributeConverter<CalendarType, String> {

    static final String BUSINESS_HOURS_CODE = "BUSINESS_HRS";

    @Override
    public String convertToDatabaseColumn(CalendarType type) {
        if (type == null) {
            return null;
        }
        return type == CalendarType.BUSINESS_HOURS ? BUSINESS_HOURS_CODE : type.name();
    }

    @Override
    public CalendarType convertToEntityAttribute(String code) {
        if (code == null) {
            return null;
        }
        return BUSINESS_HOURS_CODE.equals(code) ? CalendarType.BUSINESS_HOURS : CalendarType.valueOf(code);
    }
}
