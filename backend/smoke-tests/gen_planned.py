"""Generates src/main/resources/openapi/planned-endpoints.json (argv[1]) from API contract Appendix B and C."""
import json
import pathlib
import sys

OUT = pathlib.Path(sys.argv[1])
OUT.parent.mkdir(parents=True, exist_ok=True)


def ref(name):
    return {"$ref": f"#/components/schemas/{name}"}


def arr(item):
    return {"type": "array", "items": item}


def s(type_, **kw):
    return {"type": type_, **kw}


def obj(props, required=None, desc=None):
    o = {"type": "object", "properties": props}
    if required:
        o["required"] = required
    if desc:
        o["description"] = desc
    return o


def nullable(schema):
    return {"oneOf": [schema, {"type": "null"}]}


STR, INT, LONG, NUM, BOOL = s("string"), s("integer", format="int32"), s("integer", format="int64"), s("number"), s("boolean")
DT = s("string", format="date-time")


def enum(*values):
    return s("string", enum=list(values))


STATUS = enum("NEW", "CLASSIFIED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS", "PENDING_USER_INFO", "RESOLVED",
              "VERIFIED", "CLOSED", "REOPENED")
EVENT = enum("INCIDENT_CREATED", "INCIDENT_ASSIGNED", "INCIDENT_ACKNOWLEDGED", "PRIORITY_CHANGED", "INFO_REQUESTED",
             "INFO_PROVIDED", "SLA_WARNING", "SLA_VIOLATED", "INCIDENT_ESCALATED", "INCIDENT_RESOLVED",
             "INCIDENT_VERIFIED", "INCIDENT_CLOSED", "INCIDENT_REOPENED", "DUPLICATE_SUSPECTED", "TRIAGE_NEEDED")
CHANNEL = enum("IN_APP", "EMAIL", "WEBSOCKET", "SMS_SIM")
SOURCE = enum("LLM", "KEYWORD")
PRIORITY = enum("P1", "P2", "P3", "P4")


def page(item):
    return obj({"items": arr(ref(item)), "page": INT, "size": INT, "totalItems": LONG, "totalPages": INT},
               desc=f"One page of {item} (API contract B.1 paging)")


schemas = {
    "GoogleLoginRequest": obj({"idToken": s("string", description="Google ID token from the Sign-In button")}, ["idToken"]),
    "EscalateRequest": obj({"reason": s("string", minLength=10, maxLength=1000)}, ["reason"]),
    "MarkDuplicateRequest": obj({"duplicateOfId": s("integer", format="int64", description="An existing, different incident")}, ["duplicateOfId"]),
    "FeedbackRequest": obj({"rating": s("integer", minimum=1, maximum=5), "comment": s("string", maxLength=1000)}, ["rating"]),
    "Feedback": obj({"rating": INT, "comment": nullable(STR), "createdAt": DT}),
    "Attachment": obj({"id": LONG, "incidentId": LONG, "filename": STR, "contentType": STR, "sizeBytes": LONG,
                       "uploadedBy": ref("Ref"), "createdAt": DT},
                      desc="Allowed types png, jpg, jpeg, gif, pdf, txt, log; max 5 MB; max 10 per incident"),
    "ProblemRecord": obj({"id": LONG, "title": STR, "service": ref("Ref"), "status": enum("OPEN", "RESOLVED"),
                          "createdAt": DT, "incidents": arr(ref("IncidentSummary"))}),
    "ReportOverview": obj({"total": LONG, "open": LONG, "critical": s("integer", format="int64", description="Open P1"),
                           "resolved": LONG, "slaViolations": LONG, "avgResolutionMinutes": NUM,
                           "avgSatisfaction": nullable(s("number", minimum=0, maximum=5))}),
    "WorkloadReportRow": obj({"technicianId": LONG, "name": STR, "active": INT, "load": INT, "maxLoad": INT,
                              "avgResolutionMinutes": NUM}),
    "ServiceReportRow": obj({"serviceId": LONG, "name": STR, "count": LONG}),
    "TrendPoint": obj({"date": s("string", format="date"), "created": LONG, "resolved": LONG}),
    "LabelCount": obj({"label": STR, "count": LONG}),
    "SlaComplianceRow": obj({"label": STR, "total": LONG, "met": LONG, "violated": LONG, "compliancePercent": NUM}),
    "DashboardEvent": obj({"type": EVENT, "incidentId": LONG, "code": STR, "priority": nullable(PRIORITY),
                           "status": STATUS, "at": DT}, desc="Also pushed on the WebSocket topic /topic/dashboard"),
    "DashboardSnapshot": obj({"counters": obj({"total": LONG, "open": LONG, "critical": LONG, "resolved": LONG,
                                               "slaViolations": LONG}),
                              "byPriority": arr(ref("LabelCount")), "recentEvents": arr(ref("DashboardEvent")),
                              "atRisk": arr(ref("IncidentSummary"))}),
    "ServiceGraph": obj({"nodes": arr(obj({"id": LONG, "name": STR, "criticality": INT, "openIncidents": LONG,
                                           "hasOpenP1": BOOL})),
                         "edges": arr(obj({"from": LONG, "to": LONG}, desc="from depends on to"))}),
    "ServiceImpact": obj({"serviceId": LONG,
                          "affected": arr(obj({"id": LONG, "name": STR,
                                               "distance": s("integer", description="1 = direct dependant")}))}),
}
# M9 (notifications) is built: its schemas and operations now come from the code, not from this file


def q(name, schema, desc=None, required=False):
    p = {"name": name, "in": "query", "required": required, "schema": schema}
    if desc:
        p["description"] = desc
    return p


ID = {"name": "id", "in": "path", "required": True, "schema": LONG}
PAGING = [q("page", s("integer", minimum=0, default=0)), q("size", s("integer", minimum=1, maximum=100, default=20))]
RANGE = [q("from", DT), q("to", DT)]


def op(module, summary, who, response, status="200", body=None, params=None, public=False,
       media="application/json"):
    content = None if response is None else {media: {"schema": response}}
    resp = {"description": "Success" if status != "204" else "No content"}
    if content:
        resp["content"] = content
    o = {"tags": ["Planned"], "summary": summary,
         "description": f"**Planned for {module}; not implemented yet.** Who: {who}. "
                        f"Agreed in the API contract (Appendix B/C).",
         "x-status": "planned", "x-module": module, "responses": {status: resp}}
    if params:
        o["parameters"] = params
    if body:
        o["requestBody"] = {"required": True, "content": {"application/json": {"schema": body}}}
    if public:
        o["security"] = []
    return o


P = "/api/v1"
paths = {
    f"{P}/auth/google": {"post": op("M2b", "Sign in with a Google ID token", "public", ref("AuthResponse"),
                                    body=ref("GoogleLoginRequest"), public=True)},
    f"{P}/incidents/{{id}}/escalate": {"post": op("M11", "Raise the escalation level by one", "assignee, team lead, admin",
                                                  ref("IncidentDetail"), body=ref("EscalateRequest"), params=[ID])},
    f"{P}/incidents/{{id}}/mark-duplicate": {"post": op("M12", "Close as a duplicate of another incident", "admin, team lead",
                                                        ref("IncidentDetail"), body=ref("MarkDuplicateRequest"), params=[ID])},
    f"{P}/problems": {"get": op("M12", "Problem records grouping correlated incidents", "admin, team lead",
                                arr(ref("ProblemRecord")))},
    f"{P}/problems/{{id}}": {"get": op("M12", "One problem record with its incidents", "admin, team lead",
                                       ref("ProblemRecord"), params=[ID])},
    f"{P}/dashboard/live": {"get": op("M13", "Initial snapshot for the live dashboard", "admin", ref("DashboardSnapshot"))},
    f"{P}/services/graph": {"get": op("M13", "Service dependency graph with open incidents", "any", ref("ServiceGraph"))},
    f"{P}/services/{{id}}/impact": {"get": op("M13", "Services affected if this one fails (transitive)", "any",
                                              ref("ServiceImpact"), params=[ID])},
    f"{P}/incidents/{{id}}/attachments": {
        "post": {**op("M14", "Upload a file (type and 5 MB size checked)", "participant", ref("Attachment"), "201",
                      params=[ID]),
                 "requestBody": {"required": True, "content": {"multipart/form-data": {"schema": obj(
                     {"file": s("string", format="binary")}, ["file"])}}}},
        "get": op("M14", "Attachments of an incident", "participant", arr(ref("Attachment")), params=[ID])},
    f"{P}/attachments/{{id}}/download": {"get": op("M14", "Download an attachment", "participant",
                                                   s("string", format="binary"), params=[ID],
                                                   media="application/octet-stream")},
}
for path, methods in paths.items():
    for method, o in methods.items():
        o["operationId"] = "planned_" + method + "_" + path.replace(P + "/", "").replace("/{id}", "_by_id") \
            .replace("/", "_").replace("-", "_")

OUT.write_text(json.dumps({"openapi": "3.1.0", "info": {"title": "planned", "version": "0"},
                           "paths": paths, "components": {"schemas": schemas}}, indent=2) + "\n", encoding="utf-8")
print(f"{sum(len(m) for m in paths.values())} planned operations, {len(schemas)} schemas")
