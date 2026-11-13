package com.iitsm.domain.intelligence;

/** Past incident text with the category a person gave it: the keyword engine learns from these. */
public record LabelledText(Long categoryId, String text) {
}
