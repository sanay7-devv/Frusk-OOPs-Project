package com.iitsm.application.feedback;

import java.time.Instant;

import com.iitsm.domain.feedback.Feedback;

/** A rating as the API shows it (contract C.4 Feedback). */
public record FeedbackView(int rating, String comment, Instant createdAt) {

    public static FeedbackView of(Feedback feedback) {
        return new FeedbackView(feedback.getRating(), feedback.getComment(), feedback.getCreatedAt());
    }
}
