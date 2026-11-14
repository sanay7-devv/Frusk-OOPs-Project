package com.iitsm.application.auth;

import com.iitsm.domain.exception.TokenInvalidException;

/**
 * Port for checking a Google ID token (module M2b, DEC-04, DEC-100). Adapter pattern: the application layer only
 * knows this interface; infrastructure supplies the real adapter (signature against Google's published keys) or the
 * offline fake used by smoke runs ({@code app.google.verifier=fake}, DEC-101).
 * <p>
 * Every adapter checks the signature, the audience (our {@code GOOGLE_CLIENT_ID}), the issuer and the expiry, and
 * throws {@link RejectedTokenException} when any of them fails. Whether the email is verified is returned, not
 * checked here: that is a sign-in rule for {@link GoogleSignInService}.
 */
public interface GoogleIdTokenVerifier {

    GoogleIdentity verify(String idToken);

    /** The claims of a token whose signature, audience, issuer and expiry were checked. */
    record GoogleIdentity(String subject, String email, boolean emailVerified, String name) {
    }

    /** Answers 401 TOKEN_INVALID like any bad token; {@link #reason()} goes only to the audit trail. */
    class RejectedTokenException extends TokenInvalidException {

        private final String reason;

        public RejectedTokenException(String reason) {
            this.reason = reason;
        }

        public String reason() {
            return reason;
        }
    }
}
