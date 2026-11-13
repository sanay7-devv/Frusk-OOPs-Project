package com.iitsm.application.notification;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.notification.Audience;
import com.iitsm.domain.notification.ChannelType;
import com.iitsm.domain.notification.NotificationChannel;
import com.iitsm.domain.notification.NotificationEventType;
import com.iitsm.domain.notification.NotificationFactory;
import com.iitsm.domain.notification.NotificationFactory.Content;
import com.iitsm.domain.notification.NotificationMessage;
import com.iitsm.domain.notification.NotificationPreference;
import com.iitsm.domain.notification.NotificationRules;
import com.iitsm.domain.repository.NotificationPreferenceRepository;

/**
 * Sends a planned notification through the right channels (handbook 2.5 M9). For one person: the inbox first and
 * always, then WebSocket, simulated SMS (P1 only) and email, each unless the person switched it off, and none of
 * them can be switched off for a critical alert. A channel that throws is logged and skipped; the others still run.
 * <p>
 * Also folds the SLA warnings of one monitor run into digests when one person would get more than the threshold in
 * {@code notification.digest.threshold}; P1 incidents and SLA violations are never held back (decision DEC-42).
 * Not transactional: each channel opens the short transaction it needs.
 */
@Service
public class NotificationDispatcher {

    private static final Logger log = LoggerFactory.getLogger(NotificationDispatcher.class);

    /** The inbox first (the others need the id of its row), email last because it is the slowest. */
    private static final List<ChannelType> PERSONAL_ORDER =
            List.of(ChannelType.IN_APP, ChannelType.WEBSOCKET, ChannelType.SMS_SIM, ChannelType.EMAIL);

    /** A run that never reports its end must not hold warnings for ever. */
    private static final Duration MAX_HOLD = Duration.ofMinutes(10);
    private static final int DIGEST_LIST_LIMIT = 10;

    private final NotificationFactory factory;
    private final Map<ChannelType, NotificationChannel> channels = new EnumMap<>(ChannelType.class);
    private final NotificationPreferenceRepository preferences;
    private final DigestCollector digest;
    private final ConfigService config;
    private final Clock clock;

    public NotificationDispatcher(NotificationFactory factory, List<NotificationChannel> channelList,
                                  NotificationPreferenceRepository preferences, DigestCollector digest,
                                  ConfigService config, Clock clock) {
        this.factory = factory;
        channelList.forEach(channel -> channels.put(channel.type(), channel));
        this.preferences = preferences;
        this.digest = digest;
        this.config = config;
        this.clock = clock;
    }

    /** Sends at once. */
    public void dispatch(NotificationRequest request) {
        dispatch(request, factory.create(request.type(), request.audience(), request.values()));
    }

    /** Sends a first or second SLA warning now (P1) or holds it until the monitor run ends (everything else). */
    public void dispatchOrHold(NotificationRequest request) {
        if (request.recipient() == null || NotificationRules.neverBatched(request.priority(), request.type())) {
            dispatch(request);
            return;
        }
        Instant now = clock.instant();
        if (digest.oldest().filter(first -> Duration.between(first, now).compareTo(MAX_HOLD) > 0).isPresent()) {
            flushDigests();
        }
        digest.add(request, now);
    }

    /** The monitor run is over: one digest for everyone above the threshold, single messages for the rest. */
    public void flushDigests() {
        int threshold = config.current().intValue(ConfigKey.NOTIFICATION_DIGEST_THRESHOLD);
        digest.drain().values().forEach(held -> {
            if (held.size() > threshold) {
                sendDigest(held);
            } else {
                held.forEach(this::dispatch);
            }
        });
    }

    private void sendDigest(List<NotificationRequest> held) {
        NotificationRequest first = held.get(0);
        String list = held.stream().limit(DIGEST_LIST_LIMIT).map(r -> r.incidentCode() + " (" + r.priority() + ")")
                .collect(Collectors.joining(", "));
        if (held.size() > DIGEST_LIST_LIMIT) {
            list += " and " + (held.size() - DIGEST_LIST_LIMIT) + " more";
        }
        NotificationRequest combined = new NotificationRequest(first.recipient(), first.audience(), first.type(),
                false, null, null, null, Map.of("count", String.valueOf(held.size()), "list", list));
        log.info("Alert storm control: {} SLA warnings for user {} folded into one digest", held.size(),
                first.recipient().id());
        dispatch(combined, factory.digest(first.type(), combined.values()));
    }

    // ------------------------------------------------------------------ delivery

    private void dispatch(NotificationRequest request, Content content) {
        Instant now = clock.instant();
        if (request.audience() == Audience.ROOM) {
            send(ChannelType.CHAT, new NotificationMessage(null, null, null, request.type(), Audience.ROOM,
                    content.title(), content.message(), request.incidentId(), request.incidentCode(),
                    request.priority(), now, null));
            return;
        }
        NotificationRequest.Person person = request.recipient();
        NotificationMessage message = new NotificationMessage(person.id(), person.name(), person.email(),
                request.type(), request.audience(), content.title(), content.message(), request.incidentId(),
                request.incidentCode(), request.priority(), now, null);
        Set<ChannelType> wanted = wantedChannels(request);
        Long inboxId = null;
        for (ChannelType type : PERSONAL_ORDER) {
            if (!wanted.contains(type)) {
                continue;
            }
            Optional<Long> stored = send(type, message.withInboxId(inboxId));
            if (type == ChannelType.IN_APP) {
                inboxId = stored.orElse(null);
            }
        }
    }

    private Set<ChannelType> wantedChannels(NotificationRequest request) {
        Set<NotificationPreference> off = switchedOff(request.recipient().id());
        Set<ChannelType> wanted = new HashSet<>();
        wanted.add(ChannelType.IN_APP);
        for (ChannelType type : List.of(ChannelType.WEBSOCKET, ChannelType.SMS_SIM, ChannelType.EMAIL)) {
            boolean applies = type != ChannelType.SMS_SIM
                    || NotificationRules.smsApplies(request.priority(), request.type(), request.audience());
            boolean allowed = request.critical() || off.stream()
                    .noneMatch(p -> p.getEventType() == request.type() && p.getChannel() == type);
            if (applies && allowed) {
                wanted.add(type);
            }
        }
        return wanted;
    }

    private Set<NotificationPreference> switchedOff(Long userId) {
        try {
            return preferences.findByUser(userId).stream().filter(p -> !p.isEnabled()).collect(Collectors.toSet());
        } catch (RuntimeException ex) {
            log.warn("Could not read the notification preferences of user {}, sending on every channel: {}",
                    userId, ex.toString());
            return Set.of();
        }
    }

    /** One channel, one try; any failure is logged and never reaches the caller. */
    private Optional<Long> send(ChannelType type, NotificationMessage message) {
        NotificationChannel channel = channels.get(type);
        if (channel == null) {
            log.warn("No {} channel is registered", type);
            return Optional.empty();
        }
        try {
            return channel.send(message);
        } catch (Exception ex) {
            log.warn("Channel {} failed for {} {} (user {}), the other channels carry on: {}", type,
                    message.eventType(), message.incidentCode(), message.recipientId(), ex.toString());
            return Optional.empty();
        }
    }
}
