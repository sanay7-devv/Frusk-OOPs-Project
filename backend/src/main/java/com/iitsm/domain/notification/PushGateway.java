package com.iitsm.domain.notification;

/**
 * Adapter pattern (A4): how a push message reaches one device. The channel knows only this interface; the project
 * ships a simulated gateway (the text goes to the log), and a Firebase, Apple or Web Push gateway would be one more
 * implementation, with no change to the notification code.
 */
public interface PushGateway {

    /** @throws Exception if the provider refused or could not be reached; the channel logs it and carries on */
    void send(PushDevice device, String title, String body) throws Exception;
}
