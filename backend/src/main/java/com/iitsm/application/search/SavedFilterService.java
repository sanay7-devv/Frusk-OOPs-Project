package com.iitsm.application.search;

import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.InputValidationException.FieldIssue;
import com.iitsm.domain.exception.ResourceNotFoundException;
import com.iitsm.domain.exception.UserNotFoundException;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.incident.SlaState;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.repository.SavedFilterRepository;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.search.SavedFilter;
import com.iitsm.domain.user.User;

/**
 * Saved views (table saved_filters): a user keeps named sets of incident-list filters and reuses them. Everything
 * is private to the owner; another user's view is "not found". The filter JSON may only hold the keys of
 * GET /incidents, with values of the right kind, so a saved view can always be replayed (decision DEC-48).
 */
@Service
public class SavedFilterService {

    private static final Set<String> TEXT = Set.of("q", "code");
    private static final Set<String> NUMBERS = Set.of("categoryId", "serviceId", "assigneeId", "reporterId");
    private static final Set<String> FLAGS = Set.of("mine", "assignedToMe");
    private static final Set<String> TIMES = Set.of("createdFrom", "createdTo");
    private static final Set<String> OTHERS = Set.of("status", "priority", "slaState", "sort");
    private static final Set<String> SORT_FIELDS = Set.of("createdAt", "priority", "status", "code", "resolutionDue");

    /** One saved view as the API shows it. */
    public record SavedFilterView(Long id, String name, Map<String, Object> filter, Instant createdAt) {
        static SavedFilterView of(SavedFilter f) {
            return new SavedFilterView(f.getId(), f.getName(), f.getFilter(), f.getCreatedAt());
        }
    }

    private final SavedFilterRepository filters;
    private final UserRepository users;
    private final ConfigService config;
    private final Clock clock;

    public SavedFilterService(SavedFilterRepository filters, UserRepository users, ConfigService config,
                              Clock clock) {
        this.filters = filters;
        this.users = users;
        this.config = config;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<SavedFilterView> list(AuthenticatedUser caller) {
        return filters.findByUser_IdOrderByNameAsc(caller.id()).stream().map(SavedFilterView::of).toList();
    }

    @Transactional
    public SavedFilterView create(AuthenticatedUser caller, String name, Map<String, Object> filter) {
        List<FieldIssue> issues = new ArrayList<>();
        Map<String, Object> clean = validate(filter == null ? Map.of() : filter, issues);
        if (name == null || name.isBlank() || name.strip().length() > SavedFilter.MAX_NAME_LENGTH) {
            issues.add(new FieldIssue("name", "must be between 1 and " + SavedFilter.MAX_NAME_LENGTH + " characters"));
        } else if (filters.existsByUser_IdAndNameIgnoreCase(caller.id(), name.strip())) {
            issues.add(new FieldIssue("name", "you already have a saved view with this name"));
        }
        if (!issues.isEmpty()) {
            throw new InputValidationException("Please correct the highlighted fields.", issues);
        }
        int max = config.current().intValue(ConfigKey.SAVED_FILTERS_MAX);
        if (filters.countByUser_Id(caller.id()) >= max) {
            throw new InputValidationException("name", "you can keep at most " + max + " saved views");
        }
        User owner = users.findById(caller.id()).orElseThrow(() -> new UserNotFoundException(caller.id()));
        return SavedFilterView.of(filters.save(new SavedFilter(owner, name, clean, clock.instant())));
    }

    @Transactional
    public void delete(AuthenticatedUser caller, Long id) {
        SavedFilter filter = filters.findByIdAndUser_Id(id, caller.id())
                .orElseThrow(() -> new ResourceNotFoundException("Saved view", id));
        filters.delete(filter);
    }

    /** Checks every key and value; unknown keys and wrong kinds become field errors named filter.key. */
    private static Map<String, Object> validate(Map<String, Object> filter, List<FieldIssue> issues) {
        Map<String, Object> clean = new LinkedHashMap<>();
        filter.forEach((key, value) -> {
            String field = "filter." + key;
            if (value == null) {
                return;
            }
            if (TEXT.contains(key) && value instanceof String s && !s.isBlank()) {
                clean.put(key, s.strip());
            } else if (NUMBERS.contains(key) && value instanceof Number n && n.longValue() > 0) {
                clean.put(key, n.longValue());
            } else if (FLAGS.contains(key) && value instanceof Boolean b) {
                clean.put(key, b);
            } else if (TIMES.contains(key) && value instanceof String s && isInstant(s)) {
                clean.put(key, s);
            } else if (key.equals("status")) {
                names(value, IncidentStatus.values(), field, issues, clean, key);
            } else if (key.equals("priority")) {
                names(value, Priority.values(), field, issues, clean, key);
            } else if (key.equals("slaState") && value instanceof String s && isOneOf(SlaState.values(), s)) {
                clean.put(key, s);
            } else if (key.equals("sort") && value instanceof String s && isSort(s)) {
                clean.put(key, s);
            } else {
                boolean known = TEXT.contains(key) || NUMBERS.contains(key) || FLAGS.contains(key)
                        || TIMES.contains(key) || OTHERS.contains(key);
                issues.add(new FieldIssue(field, known ? "has an invalid value" : "is not a known filter"));
            }
        });
        return clean;
    }

    private static void names(Object value, Enum<?>[] allowed, String field, List<FieldIssue> issues,
                              Map<String, Object> clean, String key) {
        List<?> items = value instanceof List<?> list ? list : List.of(value);
        List<String> accepted = new ArrayList<>();
        for (Object item : items) {
            if (item instanceof String s && isOneOf(allowed, s)) {
                accepted.add(s);
            } else {
                issues.add(new FieldIssue(field, "contains an unknown value: " + item));
                return;
            }
        }
        if (!accepted.isEmpty()) {
            clean.put(key, accepted);
        }
    }

    private static boolean isOneOf(Enum<?>[] allowed, String name) {
        for (Enum<?> constant : allowed) {
            if (constant.name().equals(name)) {
                return true;
            }
        }
        return false;
    }

    private static boolean isInstant(String text) {
        try {
            Instant.parse(text);
            return true;
        } catch (DateTimeParseException ex) {
            return false;
        }
    }

    private static boolean isSort(String text) {
        String[] parts = text.split(",");
        return SORT_FIELDS.contains(parts[0].strip())
                && (parts.length == 1
                || (parts.length == 2 && Set.of("asc", "desc").contains(parts[1].strip().toLowerCase(Locale.ROOT))));
    }
}
