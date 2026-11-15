package com.iitsm.application.auth;

/**
 * Port: how a password reset link reaches the person (A12). The application layer decides when to send it; the
 * infrastructure decides how (mail through SMTP, to the mail catcher in development).
 */
public interface PasswordResetNotifier {

    /**
     * @param link         the address to open, already containing the secret
     * @param validMinutes how long the link works, for the sentence in the message
     */
    void send(String toEmail, String name, String link, int validMinutes);
}
