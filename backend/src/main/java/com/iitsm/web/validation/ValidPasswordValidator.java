package com.iitsm.web.validation;

import java.util.Optional;

import com.iitsm.domain.user.PasswordPolicy;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Reports the broken rule on the "password" field, so the error is {@code fieldErrors: [{field: "password", ...}]}
 * like every other field error. A missing, wrong-length or letter/digit-less password is left to the field annotations (@NotNull, @Size, @Pattern)
 * so one problem is not reported twice.
 */
public class ValidPasswordValidator implements ConstraintValidator<ValidPassword, PasswordSubject> {

    @Override
    public boolean isValid(PasswordSubject request, ConstraintValidatorContext context) {
        String password = request.password();
        boolean contractRuleBroken = password == null || password.length() < PasswordPolicy.MIN_LENGTH
                || password.length() > PasswordPolicy.MAX_LENGTH
                || password.chars().noneMatch(Character::isLetter) || password.chars().noneMatch(Character::isDigit);
        if (contractRuleBroken) {
            return true; // @NotNull, @Size and @Pattern on the field already report these
        }
        Optional<String> problem = PasswordPolicy.check(password, request.name(), request.email());
        if (problem.isEmpty()) {
            return true;
        }
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(problem.get().replace("{", "").replace("}", ""))
                .addPropertyNode("password").addConstraintViolation();
        return false;
    }
}
