# Interview Platform — Context

This document is the first real, maintained version of the project context. It describes what the
system is, how it is composed, how to run it, the auth and tenancy model, the domain, what Phase 2
delivered, known deviations, and the watch list for later phases.

## What the system is

A web platform where a recruiter schedules, runs and evaluates candidate interviews. A recruiter
signs in through Keycloak, manages reusable interview positions (with segment templates), schedules
candidate interviews against those positions (copying the templates into the interview), and then
moves each interview through its lifecycle (reschedule / cancel / no-show / complete).

Phase 2 is the **scheduling slice**: positions + segment templates, interview scheduling with
copy-on-apply, the interview list/detail, and the four lifecycle actions. **All wired end to end
from a React frontend, behind a single API gateway, tenant-isolated by organisation.**

## Services and ports

| Service | Port | Package root | Notes |
| --- | --- | --- | --- |
| `api-gateway` | `8080` | `com.interviewplatform.gateway` | Single entry point; validates the JWT; routes `/api/**` to `interview-service`; CORS. |
| `interview-service` | `8081` | `com.interviewplatform.interview` | The domain: organisations, recruiters, candidates, positions + templates, interviews + segments. |
| `notification-service` | `8082` | `com.interviewplatform.notification` | Later slice (invites/admitted/reminders). Present and healthy, no domain logic yet. |
| `frontend` | `3000` | `frontend/` | Vite + React SPA, built and served by nginx inside Docker. |
| `keycloak` | `8180` | realm `interview-platform`, client `interview-web` | OIDC identity. Ephemeral H2, realm imported on start. |
| `postgres` | `5432` | database `interview_platform` | One schema per service; the interview schema is **`interview`**. |
| `kafka` | `29092` | KRaft single-node | Later slice (events). |
| `mailhog` | `8025` / `1025` | — | Later slice (email). |

Everything beyond `mailhog` and `kafka` is in scope for Phase 2.

## Running the stack (local, Docker Compose)

```bash
# From the repo root. Fresh, deterministic cold start:
docker compose down -v
docker compose up --build -d
```

- `down -v` removes the Postgres volume **and** discards Keycloak's ephemeral H2, so the realm
  `keycloak/realm-export.json` and the Flyway migrations re-apply from a clean slate.
- Because Keycloak's H2 is ephemeral, seeded recruiter passwords are re-hashed at every start from
  the committed realm export, so they are **not** readable from the repo. Reset them after each
  start via the Keycloak admin API (see below) in order to log in.
- Watch for all containers to report **healthy** (including `frontend`). The demo/recruiter logins
  use `http://localhost:3000` (containerised UI), `http://localhost:8080` (gateway) and
  `http://localhost:8180` (Keycloak).

### Seeded recruiters and resetting passwords

Two organisations are seeded: **Alpha** (`11111111-…`) and **Beta** (`22222222-…`), each with one
recruiter whose `keycloak_subject` matches a Keycloak user:

| Keycloak user | Org | Keycloak subject |
| --- | --- | --- |
| `recruiter1` | Alpha | `050f8714-8fd9-4944-b9b2-c8f0bbb4e17f` |
| `recruiter2` | Beta | `1c2ae273-2ad2-4a48-8ef3-a633f0f46dd3` |

Because the passwords are re-imported unreadable, reset them after a cold start:

```powershell
$adm = Invoke-RestMethod -Method Post -Uri "http://localhost:8180/realms/master/protocol/openid-connect/token" `
  -Body @{ client_id="admin-cli"; username="admin"; password="@Interview123@Keycloak"; grant_type="password" } `
  -ContentType "application/x-www-form-urlencoded"
$h = @{ Authorization = "Bearer $($adm.access_token)" }
foreach ($u in @{ id="050f8714-8fd9-4944-b9b2-c8f0bbb4e17f"; pw="RecruiterPass1!" },
                @{ id="1c2ae273-2ad2-4a48-8ef3-a633f0f46dd3"; pw="RecruiterPass2!" }) {
  Invoke-RestMethod -Method Put -Headers $h `
    -Uri "http://localhost:8180/admin/realms/interview-platform/users/$($u.id)/reset-password" `
    -Body (@{ type="password"; value=$u.pw; temporary=$false } | ConvertTo-Json) -ContentType "application/json"
}
```

## Auth model

- **Identity**: Keycloak, realm `interview-platform`, public client `interview-web`, **PKCE** with
  `login-required` (the cockpit has no anonymous content). The browser never sees or sends an
  organisation id.
- **Validation**: the **gateway** validates the bearer JWT (an OAuth2 resource server) and forwards
  the request to `interview-service`, which also validates the JWT (defence in depth, short path).
- **The issuer-uri vs jwk-set-uri split (deliberate and fragile)**:
  - `APP_KEYCLOAK_ISSUER_URI=http://localhost:8180/realms/interview-platform` — used to *discover*
    the issuer from **outside** Docker (the browser-facing host).
  - `APP_KEYCLOAK_JWK_SET_URI=http://keycloak:8080/realms/interview-platform/protocol/openid-connect/certs`
    — used to fetch the **JWKS** signing keys from **inside** the Docker network (`keycloak:8080`),
    where `8080` is Keycloak's internal port.
  - This split exists because the gateway also needs the issuer claim to match the browser-visible
    host, while key fetch must use the Docker-internal hostname. If either is wrong the services get
    transient 401s on `/api/**` even with a “valid” token. A full `down -v && up --build` recreates
    Keycloak and clears this class of weirdness.

## Tenancy rule

- `organizationId` is **derived from the JWT** on the server (`TenantContext.getOrganizationId()`
  reads the `organization_id` claim, itself a user attribute mapped into the token by a Keycloak
  protocol mapper).
- **Every query is scoped by it** (`…ByOrganizationId`), and every write stamps it.
- The **browser never sends `organizationId`** — there is no such field in any request body or query.
- Cross-tenant access therefore surfaces as **404** (the resource is scoped out of the caller's
  view), not 403. Provider-of-token → org identity is the single source of truth.

## Domain entities and enums

Canonical names (use exactly these in TS types):

- **Recruiter** — `id`, `organizationId`, `keycloakSubject`, `firstName`, `lastName`, `email`.
- **Candidate** — `id`, `organizationId`, `firstName`, `lastName`, `email`, `phone`.
- **JobPosition** — `id`, `organizationId`, `name`, `description`, `status`.
  `PositionStatus = ACTIVE | INACTIVE` ("archive" = set `INACTIVE`; there is **no** hard delete).
- **TemplateSegment** — `id`, `jobPositionId`, `title`, `orderIndex`, `plannedMinutes`,
  `defaultQuestions` (string list, stored `jsonb`).
- **Interview** — `id`, `organizationId`, `recruiterId`, `candidateId`, `jobPositionId` (nullable =
  ad-hoc), `scheduledStart`, `durationMinutes`, `status`, `admitted`, `cancelledAt`,
  `reminder24hSentAt`, `reminder1hSentAt`.
- **InterviewSegment** — `id`, `interviewId`, `title`, `orderIndex`, `plannedMinutes`,
  `preparedQuestions` (string list), `actualStart`, `actualEnd`.
- **InterviewStatus** = `SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW`.

### Copy-on-apply

Scheduling against a **JobPosition** copies its **TemplateSegments** into **InterviewSegments** —
there is **no** live link back to the template (like invoice line items). In the current build the
frontend pre-fills the editable segment builder from the position's templates and can reorder/edit
them before submit; the backend honours an explicit segment list, and falls back to copying from the
position when no segments are supplied. The position's own templates are never modified by
scheduling.

## Phase 2 delivered

- **Backend (verified end to end)**: org-scoped `positions`, `interviews` (list/detail), the
  schedule endpoint with copy-on-apply + ad-hoc, and the four lifecycle actions with a valid-only-
  from-`SCHEDULED` guard (**409** out of a terminal state). Business errors return a readable
  `message`; bean-validation 400s return per-field `errors`.
- **Frontend (React 18 + Vite + TS + Tailwind v3 only)**:
  - API layer + TS types typed against the real JSON, routes into the existing protected shell.
  - **Positions**: list with status badges + empty/loading states; editor (create / edit / archive)
    with an add/reorder/remove segment-template builder.
  - **Schedule**: candidate form, position select (ad-hoc or a position), copy-on-apply into an
    editable reorderable segment builder, `datetime-local` → UTC ISO on write, redirect to detail.
  - **Interviews**: list with status filter and localised dates; detail with ordered segments and
    Reschedule / Cancel / No-show / Complete enabled only while `SCHEDULED`; 400/401/403/404/409
    surfaced readably; reschedule inline form.
- **Dockerised frontend**: multi-stage `node build → nginx serve` with SPA history fallback; gateway
  URL injected via build args; `frontend` compose service with a `/dev/tcp` healthcheck consistent
  with the backend services. Cold start brings up **all** containers healthy.
- **Docs**: this file plus `docs/Phase2-Revision-and-Viva-Prep.pdf`.

Phase 2's four-step demo passes on a cold-started stack: create a position with 3 segment templates;
schedule against it (segments arrive pre-filled and reorderable); cancel one interview and reschedule
another (list reflects both); switch to the other org's recruiter who sees **none** of the data and
gets **404** on direct ids (tenant isolation).

## Known deviations from the brief

1. **`PositionStatus` is `ACTIVE | INACTIVE`**, not `ACTIVE | ARCHIVED`. "Archive" therefore means
   `INACTIVE`.
2. Names are **`firstName` + `lastName`** everywhere; there is **no** `fullName` field. The interview
   **list** exposes a derived `candidateName` ("first last").
3. **Copy-on-apply is a defensive snapshot** — an interview never references its source templates.
4. `candidate.phone` is `NOT NULL` in the schema; the service coalesces a null input to `""`, and the
   UI treats phone as optional.

## Watch list (later phases — do not build now)

`JoinToken`/join link, Notes, Evaluation, Kafka events (admitted/reminder), video call, lobby,
payments, file upload, admin role, WebSockets. `IN_PROGRESS` and the notification service are also
unused this phase.
