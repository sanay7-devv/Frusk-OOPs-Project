package com.iitsm.application.demo;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StreamUtils;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.incident.IncidentCreationService;
import com.iitsm.application.incident.IncidentViews.IncidentDetail;
import com.iitsm.application.incident.IncidentViews.Ref;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.ServiceNotFoundException;
import com.iitsm.domain.repository.ItServiceRepository;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.service.ItService;
import com.iitsm.domain.user.RoleType;
import com.iitsm.domain.user.User;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * The outage drill (D2, decisions DEC-45 and DEC-76), demo profile only: one administrator action files the same
 * set of related incidents every time, so workflow 3 of the recorded demo (Major Incident Mode) starts in seconds
 * and looks the same in every take. Two incidents on the failing service and one on each service that depends on it
 * (up to four), from different ordinary employees, through the normal creation pipeline: nothing is faked, so the
 * duplicate confirmation, the correlation into one problem record, the priorities and the audit entries are the real
 * ones. The texts are in {@code demo/outage-drill.json}.
 */
@Service
@Profile("demo")
public class OutageDrillService {

    private static final int MAX_DEPENDENTS = 4;

    /** What the drill filed: the problem record that groups it and the incident codes in order. */
    public record DrillResult(Ref rootService, Long problemId, List<String> incidentCodes, List<Ref> dependents,
                              String note) {
    }

    private final IncidentCreationService creation;
    private final ItServiceRepository services;
    private final UserRepository users;
    private final TransactionTemplate transactions;
    private final ObjectMapper json;

    public OutageDrillService(IncidentCreationService creation, ItServiceRepository services, UserRepository users,
                              TransactionTemplate transactions, ObjectMapper json) {
        this.creation = creation;
        this.services = services;
        this.users = users;
        this.transactions = transactions;
        this.json = json;
    }

    public DrillResult run(Long rootServiceId) {
        JsonNode script = script();
        record Plan(ItService root, List<ItService> dependents, List<AuthenticatedUser> reporters) {
        }
        Plan plan = transactions.execute(status -> {
            ItService root = services.findById(rootServiceId)
                    .orElseThrow(() -> new ServiceNotFoundException(rootServiceId));
            List<ItService> dependents = services.findDependantsOf(rootServiceId).stream().limit(MAX_DEPENDENTS)
                    .toList();
            return new Plan(root, dependents, reporters());
        });
        List<IncidentDetail> filed = new ArrayList<>();
        int turn = 0;
        for (JsonNode step : script.get("root")) {
            filed.add(file(plan.reporters().get(turn++ % plan.reporters().size()), step, plan.root(), plan.root()));
        }
        int index = 0;
        for (ItService dependent : plan.dependents()) {
            JsonNode templates = script.get("dependent");
            JsonNode step = templates.get(index++ % templates.size());
            filed.add(file(plan.reporters().get(turn++ % plan.reporters().size()), step, dependent, plan.root()));
        }
        Long problemId = filed.stream().map(IncidentDetail::problemId).filter(java.util.Objects::nonNull).findFirst()
                .orElse(null);
        String note = plan.dependents().isEmpty()
                ? plan.root().getName() + " has no dependent services, so only its own incidents were filed"
                : "Filed " + filed.size() + " incidents on " + (1 + plan.dependents().size()) + " services";
        return new DrillResult(new Ref(plan.root().getId(), plan.root().getName()), problemId,
                filed.stream().map(IncidentDetail::code).toList(),
                plan.dependents().stream().map(s -> new Ref(s.getId(), s.getName())).toList(), note);
    }

    private IncidentDetail file(AuthenticatedUser reporter, JsonNode step, ItService on, ItService root) {
        return creation.create(reporter, fill(step.get("title").asString(), on, root),
                fill(step.get("description").asString(), on, root), on.getId(), null, step.get("impact").asInt(),
                step.get("urgency").asInt(), step.get("affectedUsers").asInt(), true);
    }

    private static String fill(String template, ItService on, ItService root) {
        return template.replace("{root}", root.getName()).replace("{service}", on.getName());
    }

    /** Active ordinary employees first; if there are none, any active user. */
    private List<AuthenticatedUser> reporters() {
        List<User> active = users.findAllByOrderByNameAsc().stream().filter(User::isActive).toList();
        List<User> ordinary = active.stream()
                .filter(u -> !u.hasRole(RoleType.TECHNICIAN) && !u.hasRole(RoleType.ADMINISTRATOR)).toList();
        List<User> chosen = ordinary.isEmpty() ? active : ordinary;
        if (chosen.isEmpty()) {
            throw new InputValidationException("users", "the drill needs at least one active user");
        }
        return chosen.stream().limit(6)
                .map(u -> new AuthenticatedUser(u.getId(), u.getEmail(),
                        u.getRoles().stream().map(r -> r.getType()).collect(java.util.stream.Collectors.toSet()),
                        u.getPermissions()))
                .toList();
    }

    private JsonNode script() {
        try (InputStream in = getClass().getResourceAsStream("/demo/outage-drill.json")) {
            if (in == null) {
                throw new IllegalStateException("demo/outage-drill.json is missing");
            }
            return json.readTree(StreamUtils.copyToString(in, java.nio.charset.StandardCharsets.UTF_8));
        } catch (IOException ex) {
            throw new IllegalStateException("demo/outage-drill.json cannot be read", ex);
        }
    }
}
