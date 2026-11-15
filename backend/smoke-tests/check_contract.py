"""Structural checks of the live OpenAPI contract and export to docs/openapi (argv[1] = docs/openapi dir)."""
import json
import pathlib
import re
import sys
import urllib.request

ROOT = "http://localhost:8081"
OUT = pathlib.Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

raw_json = urllib.request.urlopen(ROOT + "/v3/api-docs").read().decode()
spec = json.loads(raw_json)
raw_yaml = urllib.request.urlopen(ROOT + "/v3/api-docs.yaml").read().decode()
problems = []

# every $ref resolves
schemas = spec["components"]["schemas"]
for ref in set(re.findall(r'"\$ref"\s*:\s*"#/components/schemas/([^"]+)"', raw_json)):
    if ref not in schemas:
        problems.append(f"unresolved $ref {ref}")

ops, planned, ids = 0, 0, {}
for path, item in spec["paths"].items():
    declared = set(re.findall(r"\{([^}]+)\}", path))
    for method, op in item.items():
        ops += 1
        is_planned = "Planned" in op.get("tags", [])
        planned += is_planned
        oid = op.get("operationId")
        if oid in ids:
            problems.append(f"duplicate operationId {oid}: {method} {path} and {ids[oid]}")
        ids[oid] = f"{method} {path}"
        params = {p["name"] for p in op.get("parameters", []) if p.get("in") == "path"}
        if declared != params:
            problems.append(f"{method.upper()} {path}: path params {declared} declared as {params}")
        responses = op.get("responses", {})
        if not any(code.startswith("2") for code in responses):
            problems.append(f"{method.upper()} {path}: no success response")
        if not is_planned and not any(code.startswith("4") or code.startswith("5") for code in responses):
            problems.append(f"{method.upper()} {path}: no error responses documented")
        for code, resp in responses.items():
            for media in resp.get("content", {}):
                if media == "*/*":
                    problems.append(f"{method.upper()} {path} {code}: media type */*")
        if not is_planned and any(p.get("name") in ("caller", "principal") for p in op.get("parameters", [])):
            problems.append(f"{method.upper()} {path}: the logged-in user leaks in as a parameter")

(OUT / "iitsm-api.json").write_text(json.dumps(spec, indent=2) + "\n", encoding="utf-8")
(OUT / "iitsm-api.yaml").write_text(raw_yaml if raw_yaml.endswith("\n") else raw_yaml + "\n", encoding="utf-8")

print(f"version {spec['info']['version']}, OpenAPI {spec['openapi']}")
print(f"{ops} operations: {ops - planned} implemented, {planned} planned; {len(schemas)} schemas")
print(f"error responses on implemented operations: "
      f"{sum(1 for i in spec['paths'].values() for o in i.values() if 'Planned' not in o.get('tags', []) and '500' in o['responses'])}")
print("PROBLEMS:" if problems else "no structural problems")
for p in problems:
    print("  -", p)
