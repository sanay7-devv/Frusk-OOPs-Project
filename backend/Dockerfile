FROM eclipse-temurin:21-jdk AS build
WORKDIR /build

# Copy project files
COPY . .

# Support both build contexts (if context is repo root, copy backend contents to current dir)
RUN if [ ! -f pom.xml ] && [ -d backend ]; then cp -r backend/* backend/.* . 2>/dev/null || cp -r backend/* . ; fi

# Fix Windows CRLF line endings on mvnw and ensure executable permissions
RUN tr -d '\r' < ./mvnw > ./mvnw_fixed && mv ./mvnw_fixed ./mvnw && chmod +x ./mvnw

# Build application jar
RUN bash ./mvnw --batch-mode --no-transfer-progress -DskipTests package

FROM eclipse-temurin:21-jdk
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 app
WORKDIR /app
RUN mkdir -p /app/data/attachments && chown -R app:app /app/data
COPY --from=build /build/target/iitsm-backend-0.0.1-SNAPSHOT.jar app.jar
USER app
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=12 \
    CMD curl -fsS http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
