# Local stack and recording tools

Requires Docker Desktop with Compose v2. All published ports bind to localhost.

From the repository root, start normal development with:

```sh
docker compose -f deploy/docker-compose.yml up --build --detach --wait
```

Open the frontend at http://localhost:3000, backend health at http://localhost:8080/actuator/health, and captured mail at http://localhost:8025. Type the seeded `@iitsm.demo` credentials into the login form. The frontend's predefined `@iitsm.local` buttons currently use mock tokens; those buttons do not validate backend integration.

To customise ports or credentials, copy `deploy/.env.example` to `deploy/.env` and pass `--env-file deploy/.env` to Compose commands. Scripts below use environment variables exported in your shell (or the defaults), not a separately sourced `.env` file.

Start or recreate the disposable recording project in demo mode:

```sh
bash db/tools/reset-demo.sh
```

This intentionally removes only the `iitsm-demo` project's database volume. Other project volumes are not selected. The first build can take several minutes; warm builds are faster. Reset duration under two minutes still needs measurement on the recording laptop.

Record a snapshot and restore it:

```sh
bash db/tools/snapshot.sh
bash db/tools/restore.sh
```

Pass a different dump path as the first argument to either script. Snapshot files and local `.env` files are ignored by Git. Restore stops backend writes, performs a transactional clean restore, then starts the backend. A failed restore leaves the backend stopped so it cannot write to a partial or unexpected state.

For logs and shutdown, use the same project and compose files:

```sh
docker compose -p iitsm-demo -f deploy/docker-compose.yml -f deploy/docker-compose.demo.yml --profile demo logs -f
docker compose -p iitsm-demo -f deploy/docker-compose.yml -f deploy/docker-compose.demo.yml --profile demo down
```

Use `down --volumes` only when intentionally discarding this project's demo data. The ordinary development project is `iitsm-local` and has a separate volume; stop it before starting the demo project if using the same ports.

Actions run 43621082128 verifies image build/start, fresh demo reset, both web health endpoints, real seeded API logins, snapshot/mutate/restore, and the Postman Payment lifecycle (38 requests, 83 assertions). Reset time under two minutes on the recording laptop is still unmeasured.

Vercel deployment is outside this contribution: the team's current Vercel setup does not permit collaborator deployments. Use this local Docker setup for the Task 3 demonstration. GitHub Actions tests and builds run independently; a blocked Vercel deployment status is recorded separately from their results.
