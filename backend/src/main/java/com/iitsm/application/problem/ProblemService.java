package com.iitsm.application.problem;

import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.incident.IncidentViewMapper;
import com.iitsm.application.incident.IncidentViews.IncidentSummary;
import com.iitsm.application.incident.IncidentViews.Ref;
import com.iitsm.application.problem.ProblemViews.ProblemView;
import com.iitsm.domain.exception.ResourceNotFoundException;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.problem.ProblemRecord;
import com.iitsm.domain.problem.ProblemStatus;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.ProblemRepository;

/**
 * Problem records (module M12): lists and details for team leads and administrators. Grouping, joining and
 * resolving are added to this service as the correlation rules are built.
 */
@Service
public class ProblemService {

    private final ProblemRepository problems;
    private final IncidentRepository incidents;
    private final IncidentViewMapper views;

    public ProblemService(ProblemRepository problems, IncidentRepository incidents, IncidentViewMapper views) {
        this.problems = problems;
        this.incidents = incidents;
        this.views = views;
    }

    @Transactional(readOnly = true)
    public List<ProblemView> list(ProblemStatus status) {
        IncidentViewMapper.SummaryBuilder builder = views.summaries();
        return problems.findAllByStatusOrdered(status).stream().map(p -> view(p, builder)).toList();
    }

    @Transactional(readOnly = true)
    public ProblemView get(Long id) {
        ProblemRecord record = problems.findById(id).orElseThrow(() -> new ResourceNotFoundException("Problem", id));
        return view(record, views.summaries());
    }

    ProblemView view(ProblemRecord record, IncidentViewMapper.SummaryBuilder builder) {
        List<Incident> linked = incidents.findByProblemIdOrderByCreatedAtAsc(record.getId());
        List<IncidentSummary> summaries = linked.stream().map(builder::summary).toList();
        IncidentSummary lead = lead(linked).map(builder::summary).orElse(null);
        return new ProblemView(record.getId(), record.getTitle(),
                new Ref(record.getService().getId(), record.getService().getName()), record.getStatus(),
                record.getCreatedAt(), lead, summaries.size(), summaries);
    }

    /** The lead of a group: the highest priority, and among equals the earliest created (decision DEC-46, G5). */
    static java.util.Optional<Incident> lead(List<Incident> linked) {
        return linked.stream().min(Comparator
                .comparing((Incident i) -> i.getPriority() == null ? Priority.P4 : i.getPriority())
                .thenComparing(Incident::getCreatedAt));
    }
}
