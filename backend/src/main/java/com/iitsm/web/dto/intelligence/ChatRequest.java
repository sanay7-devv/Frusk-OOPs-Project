package com.iitsm.web.dto.intelligence;

import com.iitsm.application.intelligence.ChatIntakeService.Draft;
import com.iitsm.application.intelligence.ChatIntakeService.Slot;

import jakarta.validation.constraints.Size;

/**
 * POST /intelligence/chat: one turn of the chatbot. The first turn sends nothing, or only {@code answer} with the
 * first description. Later turns send back the {@code draft} and {@code expecting} of the previous reply, plus the
 * person's {@code answer} (the server keeps no conversation).
 */
public record ChatRequest(Draft draft, Slot expecting, @Size(max = 5000) String answer) {
}
