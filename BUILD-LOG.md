# BUILD-LOG

Append to this as you go. Commit it with the code it describes — the timestamps are part of the
evidence, and a log that arrives in one commit at the end reads as what it is.

Five lines is a real entry. Short and dated is better than long and reconstructed.

The categories we look for are listed in `DISCOVERY-BRIEF.md`. The example below shows the
*shape* of a good entry; it is a recreation of something already printed in `README.md`, so it
gives nothing away.

---

## Phase 0 — orientation

### 2026-09-26 · Clean handout and baseline

Expected the repository named in the invitation to be directly forkable as the candidate starter.
Observed: the fork included organizer files and a complete reference application, while the root
README says the candidate handout is generated under the starter directory. I renamed that
accidental fork and created the submission repository from the handout only so reference code never
entered the submission history. The handout also omitted five documents its own README cites; I
used the upstream copies labelled candidate-facing as requirements and recorded the mismatch in
DECISIONS.md.

After npm ci and npm run db:reset, the personalized fixture contained 20 permissions, including
undocumented device:reboot, and an undocumented reviewer role. This confirmed that the runtime
database catalogue must drive resolution. Baseline results were JWT 0/43, permissions and
personalization stopping at their stubs, and a successful placeholder web build. The API check
could not bind port 8123 inside the restricted shell, so that suite needs local-process permission.

## Phase 1 — token verification

### 2026-09-26 · Pin format before trusting claims

I expected Buffer's base64url decoder to reject malformed signature text. It is permissive: input
such as punctuation can decode to an empty buffer. I therefore validate every compact-token segment
against the base64url alphabet before decoding, and compare signature lengths before calling
timingSafeEqual (which throws when lengths differ). The implementation validates structure,
header, signature, and claims in that order and maps every failure to the same 401 response.

Evidence: node scripts/check-jwt.js moved from 0/43 to 43/43, including malformed encoding,
algorithm substitution, truncated signatures, and exp equal to the current second.

## Phase 2 — caller context and the resolution engine

### 2026-09-26 · Scope, precedence, and the unknown catalogue

My first mental model treated an org-level answer as role baseline plus org-wide grants. Reading
the contract again broke that model: navigation is the union across devices, so a device-only
allow can make an org-level surface appear. I changed the design before coding to resolve the
org scope first and merge allowed answers from each visible device, while exact device checks
still consider only org-wide and that device's grants.

The first implementation passed 35/35 permission vectors and 18/18 personalized vectors. It
proves deny precedence across scopes, wildcard expansion, half-open windows, suspended empty sets,
and provenance for a permission absent from every document. I also noticed resolveDevices still
repeats the resolution queries per device; it is correct but grows with row count, so query-count
measurement remains an explicit Phase 8 item.

## Phase 3 — orgs, members, invites

### 2026-09-26 · Rank rule corrected by the integrated contract

My first assertCanModify required the caller's rank to be strictly greater than the target's in
every case. The API suite reached 65/66 and rejected an owner demoting another owner even though
the org had two owners. That showed the rank table's equal-role refusal needs a narrow owner peer
exception; assertNotLastOwner remains the separate invariant that prevents removing the final
owner. After the change the API suite passed 66/66.

Invite redemption is one transaction across user creation, membership activation, and token
consumption. Raw invite and refresh credentials are returned only to the caller while HMAC hashes
are stored. The database's partial unique invite index decides duplicate live invites.

## Phase 4 — devices and grants

### 2026-09-26 · Database constraints are the final validator

Grant creation checks shape and no-laundering in code, then inserts permission patterns inside a
transaction. Unknown strings reach the grant_permissions foreign key and are translated from
SQLITE_CONSTRAINT_FOREIGNKEY to 400 VALIDATION with unknown_permission. The public API suite
confirmed device:teleport is rejected while the separate personalized suite confirms an
undocumented but catalogued permission works.

## Phase 5 — sessions

### 2026-09-26 · Keep compound failures and live authority separate

The session start path resolves once for the exact device, checks session:start first, then the
mode permission. This preserves missing_permission versus missing_device_permission. The first API
run then failed while locating the newly active session: I had camel-cased session response keys,
but the contract consumes device_id and end_reason. I restored schema-shaped session rows; the
next run reached the rank-rule failure above, and the final run passed all 66 checks.

Role changes only bump perm_version, so a new request sees TOKEN_STALE while the session's
authorized_by snapshot remains active. Suspension calls the shared endActiveSessions path and the
suite observed user_suspended, proving the lifecycle distinction.

## Phase 6 — audit

### 2026-09-26 · Denied session attempts are durable evidence

I wrapped the compound session authorization with auditDenials so a 403 creates one deny row with
the exact reason before rethrowing. Success is inserted in the same transaction as the session,
preventing an audit claim without its state change. The API suite found both an allow path and a
denial carrying a reason code; SQLite triggers protect both from update and delete.

## Phase 7 — the console

### 2026-09-26 · React cleanup bug and a stale production bundle

The first browser run passed 13/25. Login, base role views, per-device hiding, memory-only tokens,
reload, invites, and error feedback worked, but every route or organization switch later crashed.
The trace reported TypeError: m is not a function: my effects returned the Promise from load(), so
React treated it as a cleanup callback. I changed the effect wrapper to return undefined.

The immediate rerun appeared unchanged. The trace still named the old hashed bundle, revealing that
playwright.config.js claims to build before serving but its command only resets the database and
starts Node. An explicit npm run build followed by Playwright passed 25/25 in 9.4 seconds. This was
a tooling-state failure, not a second application bug, and the stale asset hash was the evidence.

The console keeps access tokens in module memory and uses the httpOnly refresh cookie after reload.
It renders navigation from /auth/me and row actions from each device's resolved map; the response
interception test removed Control without any role logic in the browser.

## Phase 8 — hardening

_What did you measure, what did you fix, and what did you deliberately leave alone? Anything you
chose not to build belongs here with its reason._

## Open threads

_Things you know are wrong, unfinished, or that you would do differently with another day. Listing
these honestly is worth more than pretending they do not exist — we will find them anyway._
