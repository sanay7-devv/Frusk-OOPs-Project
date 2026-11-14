package com.iitsm.web.validation;

/** A request that sets a password for a person: the policy also compares it with the name and e-mail. */
public interface PasswordSubject {

    String password();

    String name();

    String email();
}
