package com.iitsm.application.notification;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.ResourceNotFoundException;
import com.iitsm.domain.exception.UserNotFoundException;
import com.iitsm.domain.notification.PushDevice;
import com.iitsm.domain.repository.PushDeviceRepository;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.user.User;

/**
 * The caller's push devices (A4, decision DEC-117): register, list, remove. Every operation is scoped to the caller.
 * The full token is never returned, only the last six characters.
 */
@Service
public class PushDeviceService {

    /** A registered device as shown to its owner. */
    public record DeviceView(Long id, String platform, String tokenHint, Instant createdAt, Instant lastSeenAt) {
    }

    /** {@code created} is false when the same device was registered again (answered 200 instead of 201). */
    public record Registration(DeviceView device, boolean created) {
    }

    private final PushDeviceRepository devices;
    private final UserRepository users;
    private final ConfigService config;
    private final Clock clock;

    public PushDeviceService(PushDeviceRepository devices, UserRepository users, ConfigService config, Clock clock) {
        this.devices = devices;
        this.users = users;
        this.config = config;
        this.clock = clock;
    }

    @Transactional
    public Registration register(AuthenticatedUser caller, String token, PushDevice.Platform platform) {
        User user = users.findById(caller.id()).orElseThrow(() -> new UserNotFoundException(caller.id()));
        Instant now = clock.instant();
        String clean = token.strip();
        var existing = devices.findByToken(clean);
        if (existing.isPresent()) {
            PushDevice device = existing.get();
            device.reassign(user, platform, now);
            return new Registration(view(device), false);
        }
        int max = config.current().intValue(ConfigKey.NOTIFICATION_PUSH_DEVICES_MAX);
        if (devices.countByUser_Id(user.getId()) >= max) {
            throw new InputValidationException("token", "you already have " + max + " devices; remove one first");
        }
        return new Registration(view(devices.save(new PushDevice(user, clean, platform, now))), true);
    }

    @Transactional(readOnly = true)
    public List<DeviceView> list(AuthenticatedUser caller) {
        return devices.findByUser_IdOrderByIdAsc(caller.id()).stream().map(PushDeviceService::view).toList();
    }

    @Transactional
    public void remove(AuthenticatedUser caller, Long id) {
        PushDevice device = devices.findById(id).filter(d -> d.getUser().getId().equals(caller.id()))
                .orElseThrow(() -> new ResourceNotFoundException("Device", id));
        devices.delete(device);
    }

    private static DeviceView view(PushDevice d) {
        return new DeviceView(d.getId(), d.getPlatform().name(), d.tokenHint(), d.getCreatedAt(), d.getLastSeenAt());
    }
}
