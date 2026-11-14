package com.iitsm.application.intelligence;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.intelligence.IntelligenceViews.IntakeSuggestionView;
import com.iitsm.domain.intelligence.AnalysisSource;
import com.iitsm.domain.repository.ItServiceRepository;
import com.iitsm.domain.service.ItService;

/**
 * Chatbot incident reporting (A1, decision DEC-75): a guided conversation that fills the same fields as the report
 * form and then hands the finished draft to the normal {@code POST /incidents}, so the duplicate check, the known
 * outage banner, priority and assignment all apply unchanged.
 * <p>
 * <b>Stateless.</b> The client sends back the draft it received plus the slot the bot asked about and the person's
 * answer; the server keeps no conversation. Slots are asked in a fixed order: DESCRIPTION, SERVICE, AFFECTED_USERS;
 * once all are known the bot summarises and the draft is {@code readyToFile}. Category, impact and urgency are never
 * asked: they come from the suggest-intake engine (LLM with keyword fallback, so the flow works without a key), and
 * the reporter can still change them in the summary step of the frontend.
 */
@Service
public class ChatIntakeService {

    /** The things the bot may be waiting for. */
    public enum Slot { DESCRIPTION, SERVICE, AFFECTED_USERS, CONFIRM }

    /** The report so far; null fields are still unknown. */
    public record Draft(String title, String description, Long serviceId, String serviceName, Long categoryId,
                        String categoryName, Integer impact, Integer urgency, Integer affectedUsers) {
        Draft with(String title, String description, Long serviceId, String serviceName, Long categoryId,
                   String categoryName, Integer impact, Integer urgency, Integer affectedUsers) {
            return new Draft(title, description, serviceId, serviceName, categoryId, categoryName, impact, urgency,
                    affectedUsers);
        }
    }

    public record Option(Long id, String name) {
    }

    /**
     * @param expecting  the slot the next answer is for; null when the draft is complete
     * @param readyToFile true when every field needed by POST /incidents is filled
     * @param options    choices for the SERVICE slot (every active service)
     * @param source     which engine suggested category, impact and urgency (LLM or KEYWORD)
     */
    public record Reply(Draft draft, String message, Slot expecting, boolean readyToFile, List<Option> options,
                        AnalysisSource source) {
    }

    private static final int MIN_DESCRIPTION = 20;
    private static final Pattern NUMBER = Pattern.compile("(\\d{1,7})");

    private final IntelligenceService intelligence;
    private final ItServiceRepository services;

    ChatIntakeService(IntelligenceService intelligence, ItServiceRepository services) {
        this.intelligence = intelligence;
        this.services = services;
    }

    @Transactional(readOnly = true)
    public Reply next(AuthenticatedUser caller, Draft current, Slot expecting, String answer) {
        Draft draft = current == null ? new Draft(null, null, null, null, null, null, null, null, null) : current;
        List<ItService> active = services.findByActiveTrueOrderByNameAsc();
        String text = answer == null ? "" : answer.strip();
        AnalysisSource source = AnalysisSource.KEYWORD;

        Slot asked = expecting == null ? Slot.DESCRIPTION : expecting;
        String problem = null;
        switch (asked) {
            case DESCRIPTION -> {
                if (text.length() < MIN_DESCRIPTION) {
                    problem = "Could you tell me a little more? A sentence or two about what is going wrong helps "
                            + "(at least " + MIN_DESCRIPTION + " characters).";
                } else {
                    draft = draft.with(titleOf(text), text, draft.serviceId(), draft.serviceName(), draft.categoryId(),
                            draft.categoryName(), draft.impact(), draft.urgency(), draft.affectedUsers());
                    IntakeSuggestionView intake = intelligence.suggestIntake(caller, text);
                    source = intake.source();
                    draft = draft.with(draft.title(), draft.description(), draft.serviceId(), draft.serviceName(),
                            intake.categoryId(), intake.categoryName(), intake.impact(), intake.urgency(),
                            draft.affectedUsers());
                    if (draft.serviceId() == null) {
                        ItService guess = matchService(active, text);
                        if (guess != null) {
                            draft = draft.with(draft.title(), draft.description(), guess.getId(), guess.getName(),
                                    draft.categoryId(), draft.categoryName(), draft.impact(), draft.urgency(),
                                    draft.affectedUsers());
                        }
                    }
                }
            }
            case SERVICE -> {
                ItService chosen = matchService(active, text);
                if (chosen == null) {
                    problem = "I could not match \"" + text + "\" to a service. Please pick one from the list.";
                } else {
                    draft = draft.with(draft.title(), draft.description(), chosen.getId(), chosen.getName(),
                            draft.categoryId(), draft.categoryName(), draft.impact(), draft.urgency(),
                            draft.affectedUsers());
                }
            }
            case AFFECTED_USERS -> {
                Integer count = countOf(text);
                if (count == null) {
                    problem = "How many people are affected, roughly? A number is fine, or say \"just me\".";
                } else {
                    draft = draft.with(draft.title(), draft.description(), draft.serviceId(), draft.serviceName(),
                            draft.categoryId(), draft.categoryName(), draft.impact(), draft.urgency(), count);
                }
            }
            case CONFIRM -> {
                if (text.toLowerCase(Locale.ROOT).matches("(?s)(no|nope|change|wrong).*")) {
                    return reply(draft, "No problem. Tell me again what is going wrong and I will start over.",
                            Slot.DESCRIPTION, false, active, source);
                }
            }
        }
        if (problem != null) {
            return reply(draft, problem, asked, false, active, source);
        }
        return advance(draft, active, source);
    }

    /** The first slot still empty, or the summary when the draft is complete. */
    private Reply advance(Draft draft, List<ItService> active, AnalysisSource source) {
        if (draft.description() == null) {
            return reply(draft, "Hi, I am the IT help desk bot. What is going wrong?", Slot.DESCRIPTION, false, active,
                    source);
        }
        if (draft.serviceId() == null) {
            return reply(draft, "Thanks. Which service is it about? Pick one from the list or type its name.",
                    Slot.SERVICE, false, active, source);
        }
        if (draft.affectedUsers() == null) {
            return reply(draft, "Got it, " + draft.serviceName() + ". Roughly how many people are affected?",
                    Slot.AFFECTED_USERS, false, active, source);
        }
        Draft complete = draft.impact() == null || draft.urgency() == null
                ? draft.with(draft.title(), draft.description(), draft.serviceId(), draft.serviceName(),
                        draft.categoryId(), draft.categoryName(), draft.impact() == null ? 3 : draft.impact(),
                        draft.urgency() == null ? 3 : draft.urgency(), draft.affectedUsers())
                : draft;
        String summary = "Here is what I will report: \"" + complete.title() + "\" on " + complete.serviceName()
                + (complete.categoryName() == null ? "" : ", category " + complete.categoryName())
                + ", " + complete.affectedUsers() + " affected, impact " + complete.impact() + " and urgency "
                + complete.urgency() + " out of 5. Shall I file it?";
        return reply(complete, summary, Slot.CONFIRM, true, active, source);
    }

    private static Reply reply(Draft draft, String message, Slot expecting, boolean ready, List<ItService> active,
                               AnalysisSource source) {
        List<Option> options = expecting == Slot.SERVICE
                ? active.stream().map(s -> new Option(s.getId(), s.getName())).toList() : List.of();
        return new Reply(draft, message, expecting, ready, options, source);
    }

    /** A short title: the first sentence, cut at 80 characters on a word boundary. */
    static String titleOf(String description) {
        String first = description.split("(?<=[.!?])\\s", 2)[0].strip();
        if (first.length() <= 80) {
            return first.length() >= 5 ? first : description.substring(0, Math.min(80, description.length()));
        }
        int cut = first.lastIndexOf(' ', 80);
        return first.substring(0, cut > 20 ? cut : 80).strip();
    }

    /**
     * The service whose name (or a distinctive word of it, four letters or more) appears in the text; the longest
     * match wins; null when nothing or several equally long names match.
     */
    static ItService matchService(List<ItService> active, String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        ItService best = null;
        int bestLength = 0;
        boolean tie = false;
        for (ItService service : active) {
            String name = service.getName().toLowerCase(Locale.ROOT);
            int score = lower.contains(name) ? name.length() : 0;
            if (score == 0) {
                for (String word : name.split("[^a-z0-9]+")) {
                    if (word.length() >= 4 && lower.matches("(?s).*\\b" + Pattern.quote(word) + "\\b.*")) {
                        score = Math.max(score, word.length());
                    }
                }
            }
            if (score > bestLength) {
                best = service;
                bestLength = score;
                tie = false;
            } else if (score == bestLength && score > 0) {
                tie = true;
            }
        }
        return tie ? null : best;
    }

    /** A number in the answer, or "just me" as 1; null when neither is there. */
    static Integer countOf(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.matches("(?s).*\\b(just me|only me|myself|only i)\\b.*")) {
            return 1;
        }
        Matcher matcher = NUMBER.matcher(lower);
        if (matcher.find()) {
            int value = Integer.parseInt(matcher.group(1));
            return value >= 1 ? value : null;
        }
        if (lower.matches("(?s).*\\b(a few|couple|several)\\b.*")) {
            return 5;
        }
        if (lower.matches("(?s).*\\b(everyone|everybody|whole|entire|all of us)\\b.*")) {
            return 100;
        }
        return null;
    }
}
