package com.iitsm.domain.notification;

/**
 * The ways a notification can reach someone (handbook 2.5 M9, plus the chat webhook of decision DEC-43 A6).
 * The first four are the values of the contract and of the CHECK constraint in Appendix A.4; {@link #CHAT} is a
 * shared room, never stored and never a per-user preference.
 */
public enum ChannelType {
    /** A row in the inbox; always on. */
    IN_APP(true, true),
    /** HTML mail through SMTP; delivery only, no row. */
    EMAIL(false, true),
    /** A push to the user's STOMP queue; delivery only, no row. */
    WEBSOCKET(false, true),
    /** A simulated text message: a log line and a row. Only for P1. */
    SMS_SIM(true, true),
    /** One post to a chat room; delivery only, no row, settings in app_config. */
    CHAT(false, false);

    private final boolean stored;
    private final boolean perUser;

    ChannelType(boolean stored, boolean perUser) {
        this.stored = stored;
        this.perUser = perUser;
    }

    /** True when the channel writes a row to the notifications table. */
    public boolean isStored() {
        return stored;
    }

    /** True when a person can have a preference for the channel. */
    public boolean isPerUser() {
        return perUser;
    }
}
