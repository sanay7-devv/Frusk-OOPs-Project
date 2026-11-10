package com.iitsm.web.openapi;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * The business errors an endpoint can return, next to the endpoint itself, so the published contract cannot drift
 * from the code. {@link ApiErrorsCustomizer} turns them into documented responses. Errors every endpoint shares
 * (400 for bad input, 401 without a valid token, 403 on permission-guarded endpoints, 500) are added automatically.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface ApiErrors {

    ErrorCode[] value();
}
