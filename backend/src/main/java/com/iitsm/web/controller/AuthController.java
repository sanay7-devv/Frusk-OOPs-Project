package com.iitsm.web.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.auth.AuthService;
import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.auth.GoogleSignInService;
import com.iitsm.web.dto.auth.AuthResponse;
import com.iitsm.web.dto.auth.CurrentUserResponse;
import com.iitsm.web.dto.auth.GoogleLoginRequest;
import com.iitsm.web.dto.auth.LoginRequest;
import com.iitsm.web.dto.auth.RefreshTokenRequest;
import com.iitsm.web.dto.auth.RegisterRequest;
import com.iitsm.web.openapi.ApiErrors;
import com.iitsm.web.openapi.ErrorCode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/** Authentication endpoints (API contract B.4). Thin: validates input, delegates to AuthService, maps to DTOs. */
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Auth")
public class AuthController {

    private final AuthService authService;
    private final GoogleSignInService googleSignIn;

    public AuthController(AuthService authService, GoogleSignInService googleSignIn) {
        this.authService = authService;
        this.googleSignIn = googleSignIn;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirements // public: no bearer token
    @Operation(summary = "Register a new user (EMPLOYEE role only)")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return AuthResponse.from(authService.register(
                request.name(), request.email(), request.password(), request.department()));
    }

    @PostMapping("/login")
    @SecurityRequirements
    @Operation(summary = "Log in with email and password")
    @ApiErrors({ErrorCode.INVALID_CREDENTIALS, ErrorCode.ACCOUNT_LOCKED})
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return AuthResponse.from(authService.login(request.email(), request.password()));
    }

    @PostMapping("/google")
    @SecurityRequirements
    @Operation(summary = "Sign in with a Google ID token (links an existing account by verified email; "
            + "new accounts only when auto-registration is on)")
    @ApiErrors({ErrorCode.TOKEN_INVALID, ErrorCode.INVALID_CREDENTIALS, ErrorCode.ACCOUNT_LOCKED})
    public AuthResponse google(@Valid @RequestBody GoogleLoginRequest request) {
        return AuthResponse.from(googleSignIn.signIn(request.idToken()));
    }

    @PostMapping("/refresh")
    @SecurityRequirements
    @Operation(summary = "Exchange a refresh token for new tokens (the old refresh token stops working)")
    @ApiErrors({ErrorCode.TOKEN_INVALID})
    public AuthResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return AuthResponse.from(authService.refresh(request.refreshToken()));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Revoke a refresh token")
    public void logout(@AuthenticationPrincipal AuthenticatedUser caller,
                       @Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(caller, request.refreshToken());
    }

    @GetMapping("/me")
    @Operation(summary = "The logged-in user with roles and permissions")
    @ApiErrors({ErrorCode.USER_NOT_FOUND})
    public CurrentUserResponse me(@AuthenticationPrincipal AuthenticatedUser caller) {
        return CurrentUserResponse.from(authService.currentUser(caller));
    }
}
