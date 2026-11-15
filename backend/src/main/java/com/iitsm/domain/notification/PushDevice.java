package com.iitsm.domain.notification;

import java.time.Instant;

import com.iitsm.domain.user.User;

import jakarta.persistence.Column;
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

/**
 * A phone, tablet or browser a person registered to receive push notifications (table push_devices, A4, decision
 * DEC-117). The token is the address the push provider gave that device; it belongs to one person at a time, so a
 * device handed to someone else moves to them when they register it.
 */
@Entity
@Table(name = "push_devices")
public class PushDevice {

    /** What kind of device, for the provider that will carry the message. */
    public enum Platform { WEB, ANDROID, IOS }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "token", nullable = false, unique = true, length = 255)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(name = "platform", nullable = false, length = 10)
    private Platform platform;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;

    protected PushDevice() {
    }

    public PushDevice(User user, String token, Platform platform, Instant now) {
        this.user = user;
        this.token = token;
        this.platform = platform;
        this.createdAt = now;
        this.lastSeenAt = now;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getToken() {
        return token;
    }

    public Platform getPlatform() {
        return platform;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastSeenAt() {
        return lastSeenAt;
    }

    /** The same device registers again (for example after the app starts): it may now belong to someone else. */
    public void reassign(User newOwner, Platform newPlatform, Instant now) {
        this.user = newOwner;
        this.platform = newPlatform;
        this.lastSeenAt = now;
    }

    /** The last six characters, enough to tell devices apart without exposing the address. */
    public String tokenHint() {
        return token.length() <= 6 ? token : "…" + token.substring(token.length() - 6);
    }
}
