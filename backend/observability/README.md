# Observability for I-ITSM (A8)

Prometheus scrapes the backend's `/actuator/prometheus` every 15 seconds; Grafana shows the dashboard **I-ITSM service desk**. Design and reasons: `backend/docs/DECISIONS.md` DEC-115 and `SYSTEM_GUIDE.md` section 12j.

## Run it

From the repository root, with the normal stack's requirements met (Docker Desktop):

```bash
export METRICS_TOKEN=$(openssl rand -hex 16)          # any string of 16 or more characters
echo -n "$METRICS_TOKEN" > backend/observability/metrics_token   # git-ignored
docker compose -f deploy/docker-compose.yml -f backend/observability/docker-compose.observability.yml up -d
```

- Grafana: http://localhost:3001 (user `admin`, password `admin`), dashboard **I-ITSM service desk** in the folder I-ITSM.
- Prometheus: http://localhost:9090 (Status, Targets: `iitsm-backend` should be UP).
- The override passes `METRICS_TOKEN` to the backend. Without that variable `/actuator/prometheus` answers 404 on purpose.

To look at the raw metrics by hand:

```bash
curl -H "Authorization: Bearer $METRICS_TOKEN" http://localhost:8080/actuator/prometheus | grep iitsm_
```

## What is in the folder

| File | Purpose |
|---|---|
| `prometheus.yml` | One scrape job with the bearer token read from `metrics_token` |
| `docker-compose.observability.yml` | Adds Prometheus and Grafana to the existing stack without editing `deploy/` (paths are relative to `deploy/`, the first `-f` file) |
| `grafana/provisioning/` | The Prometheus data source (uid `prometheus`) and the dashboard provider |
| `grafana/dashboards/iitsm.json` | 15 panels: open, critical, SLA violations, open by priority, reported and resolved per hour, SLA warnings and violations per hour, escalations, API rate and latency, AI engine used, JVM heap, database connections |

## Honest note

The files were validated by parsing and by checking every metric name in the dashboard's queries against a running backend. The Prometheus and Grafana containers themselves were not started where this was written (their images were not downloaded there), so run it once and look at the dashboard before relying on it in a recording. Some counters (SLA warnings, SLA violations, escalations) appear only after their first event; the dashboard shows "No data" for them until then.
