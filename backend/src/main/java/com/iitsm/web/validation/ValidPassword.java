package com.iitsm.web.validation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

/** Class-level check of the password policy (domain {@code PasswordPolicy}) on a {@link PasswordSubject}. */
@Documented
@Constraint(validatedBy = ValidPasswordValidator.class)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidPassword {

    String message() default "does not meet the password policy";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
