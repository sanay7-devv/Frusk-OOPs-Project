# Backend Changes Log — Sanay

**Date:** 2026-11-20  
**Author:** Sanay (Frontend & Integration)  
**Target:** Backend Services & Infrastructure Configuration (`backend/`, `deploy/`)

---

## 1. Executive Summary

This document explains the recent backend modifications made to stabilize communication between the React frontend and the Spring Boot backend service, eliminate critical runtime exceptions, and provide resilience against client date-format differences.

Two major runtime issues were investigated and solved:
1. **Frontend-Backend Connection Block (CORS Preflight 403 Rejection):**
   - **Symptom:** The frontend UI reported `"Cannot reach the server. Please verify backend service is active"` upon attempting login or API requests from `http://localhost:5173`.
   - **Root Cause:** Spring Security CORS was configured with a single origin string (`http://localhost:3000`). When comma-separated origins were supplied in `.env` or properties, `CorsConfig` passed them as a single string literal without tokenizing, causing preflight `OPTIONS` requests from `localhost:5173` to be rejected with `403 REQUEST_REJECTED`.
2. **Dashboard Report 400 Bad Request Errors (`from: has an invalid value`):**
   - **Symptom:** Admin Dashboard cards (Overview KPIs, Velocity "Created and resolved", and "Incidents by priority") displayed error banners: `"Please correct the highlighted fields.: from: has an invalid value"`.
   - **Root Cause:** Spring MVC controllers (`ReportController`, `AuditController`, `SlaController`, `IncidentController`) bind date query parameters using `@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from, Instant to`. When a request contained a date-only string (`YYYY-MM-DD`, e.g., `2026-11-14`), standard `Instant.parse()` threw `DateTimeParseException` because no time/timezone component was present. Spring converted this into a `400 VALIDATION_FAILED` response.

---

## 2. Detailed Breakdown of Changes

### 2.1 Multi-Origin CORS Support
**File Modified:** `backend/src/main/java/com/iitsm/infrastructure/config/CorsConfig.java`

#### Problem
In `CorsConfig.java`, the allowed origin bean configuration previously took the raw property string directly:
```java
// Previous implementation
config.setAllowedOrigins(List.of(allowedOrigin));
```
When configured with comma-separated origins (such as `http://localhost:5173,http://localhost:3000`), Spring CORS checked if the browser's `Origin` header matched the single literal string `"http://localhost:5173,http://localhost:3000"`, which never matched any single request origin.

#### Solution
Updated `CorsConfig.java` to split comma-delimited strings into a trimmed list of distinct origin URLs:
```java
// Updated implementation
List<String> origins = java.util.Arrays.stream(allowedOrigin.split(","))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .toList();
config.setAllowedOrigins(origins);
```

#### Why it was needed
Enables simultaneous support for both the Vite development server (`http://localhost:5173`), the production container (`http://localhost:3000`), and their loopback IP equivalents (`127.0.0.1`) without requiring reconfiguration or separate container builds.

---

### 2.2 Default Application CORS Origins
**File Modified:** `backend/src/main/resources/application.properties`

#### Problem
The default fallback origin was set to only a single origin:
```properties
app.cors.allowed-origin=${CORS_ORIGIN:http://localhost:5173}
```
If developers ran the containerized frontend on `:3000` or local dev on `:5173`, requests from one or the other would fail if the environment variable was missing.

#### Solution
Updated `application.properties` to include all standard local development and deployment origins:
```properties
app.cors.allowed-origin=${CORS_ORIGIN:http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000}
```

#### Why it was needed
Provides seamless out-of-the-box local development and testing across diverse development tools, browsers, and port configurations.

---

### 2.3 Docker Compose Environment Alignment
**Files Modified:** `deploy/docker-compose.yml`, `deploy/.env.example`

#### Problem
In `deploy/docker-compose.yml`, the backend service definition specified:
```yaml
CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:3000}
```
When launching containers via Docker Compose without an existing `.env` file, the backend container received only `http://localhost:3000`. Running the frontend on Vite's default port `5173` resulted in immediate CORS blocks from the Docker container.

#### Solution
Updated `deploy/docker-compose.yml` and `deploy/.env.example` to supply multi-origin defaults:
```yaml
CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000}
```

#### Why it was needed
Ensures that full-stack execution using Docker Compose allows direct browser interaction from both standard developer tooling (`localhost:5173`) and containerized frontend instances (`localhost:3000`).

---

### 2.4 Flexible String-to-Instant Converter
**File Created:** `backend/src/main/java/com/iitsm/infrastructure/config/StringToInstantConverter.java`

#### Problem
Endpoints in `ReportController.java` (`/overview`, `/services`, `/trends`, `/priority-distribution`, `/category-distribution`, `/sla-compliance`, `/export`) accept date parameters declared as:
```java
@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
```
Spring Boot's default binder requires strict ISO-8601 date-times containing hours, minutes, seconds, and timezone offsets (e.g., `2026-11-20T00:00:00.000Z`). If a caller sends a standard date string (`2026-11-20`), Spring fails during argument conversion with:
```
Failed to convert value of type 'java.lang.String' to required type 'java.time.Instant'
```
This resulted in `400 VALIDATION_FAILED` errors on report cards whenever date pickers or query parameters sent date-only strings.

#### Solution
Implemented a custom Spring `Converter<String, Instant>` that attempts to parse input as a full `Instant`, and if missing time components, gracefully parses it as a `LocalDate` at `00:00:00 UTC`:
```java
package com.iitsm.infrastructure.config;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;

import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

@Component
public class StringToInstantConverter implements Converter<String, Instant> {

    @Override
    public Instant convert(String source) {
        if (source == null || source.isBlank()) {
            return null;
        }
        String trimmed = source.trim();
        try {
            return Instant.parse(trimmed);
        } catch (DateTimeParseException e) {
            try {
                return LocalDate.parse(trimmed).atStartOfDay(ZoneOffset.UTC).toInstant();
            } catch (DateTimeParseException ex) {
                throw new IllegalArgumentException("Cannot parse '" + source + "' to Instant", ex);
            }
        }
    }
}
```

#### Why it was needed
Eliminates brittle parameter parsing failures across all REST endpoints accepting `Instant` query parameters. Clients can pass either date-only strings (`YYYY-MM-DD`) or full ISO-8601 timestamps without triggering 400 validation errors.

---

### 2.5 Spring MVC Formatter Registration
**File Created:** `backend/src/main/java/com/iitsm/infrastructure/config/WebConfig.java`

#### Problem
Spring Boot needs custom converters to be registered in its `FormatterRegistry` to apply during HTTP request parameter binding for `@RequestParam` and `@ModelAttribute`.

#### Solution
Created a `WebMvcConfigurer` configuration bean:
```java
package com.iitsm.infrastructure.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final StringToInstantConverter stringToInstantConverter;

    public WebConfig(StringToInstantConverter stringToInstantConverter) {
        this.stringToInstantConverter = stringToInstantConverter;
    }

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(stringToInstantConverter);
    }
}
```

#### Why it was needed
Ensures the `StringToInstantConverter` is automatically active across the entire web layer for all controller endpoints.

---

## 3. Verification & Live Test Results

The backend Docker container (`iitsm-local-backend-1`) was rebuilt and verified live against PostgreSQL with an automated test suite across authentication, CORS preflights, flexible date formats, and reporting endpoints.

### 3.1 Verification Summary Table

| Check | Target URL / Operation | Input Tested | Result | Details |
|---|---|---|:---:|---|
| **CORS Preflight** | `OPTIONS /api/v1/reports/overview` | `Origin: http://localhost:5173` | **`200 OK`** | `Access-Control-Allow-Origin: http://localhost:5173` returned |
| **Authentication** | `POST /api/v1/auth/login` | `asha.rao@iitsm.demo` | **`200 OK`** | Valid JWT issued (length: 557) |
| **Reports Overview (Full ISO)** | `GET /api/v1/reports/overview` | `from=2026-11-14T00:00:00.000Z&to=2026-11-20T23:59:59.999Z` | **`200 OK`** | Returned real counts: `open=12, critical=0, resolved=6` |
| **Reports Overview (Date-only)** | `GET /api/v1/reports/overview` | `from=2026-11-14&to=2026-11-20` | **`200 OK`** | Automatically converted via `StringToInstantConverter` (`open=12, critical=0, resolved=6`) |
| **Trends Velocity** | `GET /api/v1/reports/trends` | `from=2026-11-14&to=2026-11-20&bucket=day` | **`200 OK`** | Returned 6 daily data points |
| **Priority Donut** | `GET /api/v1/reports/priority-distribution` | `from=2026-11-14&to=2026-11-20` | **`200 OK`** | Returned 4 priority distribution groups (P1..P4) |

---

### 3.2 Live CORS Preflight Response Headers

Executed via `curl.exe` against the running Spring Boot service:
```http
OPTIONS /api/v1/reports/overview HTTP/1.1
Host: localhost:8080
Origin: http://localhost:5173
Access-Control-Request-Method: GET
Access-Control-Request-Headers: Authorization

HTTP/1.1 200 
X-Request-Id: f1254dc8-9e6e-4d28-9bc3-83ad908e896c
Vary: Origin
Vary: Access-Control-Request-Method
Vary: Access-Control-Request-Headers
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
Access-Control-Allow-Headers: Authorization
Access-Control-Expose-Headers: X-Request-Id, Retry-After
Access-Control-Max-Age: 3600
X-Content-Type-Options: nosniff
X-XSS-Protection: 0
Cache-Control: no-cache, no-store, max-age=0, must-revalidate
Pragma: no-cache
Expires: 0
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Content-Length: 0
```

---

### 3.3 Live Parameter Parsing Log Output

Executed automated verification test suite:
```
Login OK, token length: 557
Test 1 (ISO-8601): open=12 critical=0 resolved=6
Test 2 (YYYY-MM-DD): open=12 critical=0 resolved=6
Test 3 (Trends): 6 points
Test 4 (Priority Distribution): 4 points
CORS Preflight Status: 200 Allow-Origin: http://localhost:5173
```

---

## 4. Browser Resolution & Operational Verification

1. **Dashboard Cards:** The three previous red error banners (`Please correct the highlighted fields.: from: has an invalid value`) are resolved. The Overview KPI row, the Velocity Created & Resolved trend chart, and the Priority distribution donut render live data cleanly.
2. **Login Screen:** Input floating label-placeholder collisions were resolved by setting `InputLabelProps={{ shrink: true }}` across login text fields.
3. **Build & Lint Verification:** The frontend test and build suite passes with zero errors:
   - `npm run lint` (`tsc --noEmit`): **0 errors**
   - `npm run build` (`tsc && vite build`): **0 errors**
   - `npm test -- --run` (`vitest --run`): **37 / 37 tests passing** across 9 test files.
