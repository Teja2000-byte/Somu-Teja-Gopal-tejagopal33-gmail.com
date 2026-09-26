# DECISIONS

One section per decision that a reviewer might reasonably have made differently. Every section has
the same four parts, and the third and fourth are the ones we weigh most.

Rules, from `DISCOVERY-BRIEF.md`:

- cite something real in `Why` — a commit, a test, an error string, a file and line
- do not restate what a document says; describe what you did when the documents ran out
- six to twelve decisions is the expected range

---

### Runtime database rows define the authorization vocabulary

**What I chose:** resolve roles, permissions, role baselines, patterns, and grants from SQLite on
each request instead of encoding a role matrix in JavaScript.
**Why:** the Phase 0 reset reported 20 permissions and a reviewer role, while the published
reference data documents 19 permissions and five roles. scripts/check-personalisation.js builds
the same shape with values derived from a nonce and grading uses another nonce.
**What I rejected:** a constant permission matrix. It would pass the documented fixture but omit
device:reboot now and whatever unseen permission the grading fixture creates.
**What would change my mind:** a migration that removes these catalogue tables and defines an
immutable, versioned policy in application code.

---

### Reject malformed JWTs through one indistinguishable error path

**What I chose:** validate compact structure and base64url characters before JSON decoding, pin
HS256/JWT, compare the HMAC in constant time, then validate claims; all failures become the same
401 UNAUTHENTICATED response.
**Why:** Phase 1 showed Node's base64url decoder accepts malformed punctuation rather than reliably
throwing. scripts/check-jwt.js exercises 43 cases and now passes all 43, including malformed input,
algorithm substitution, and signatures with a different length.
**What I rejected:** decoding first and relying on exceptions. Permissive decoding makes malformed
input proceed farther than intended, while timingSafeEqual itself throws on unequal lengths.
**What would change my mind:** adopting a maintained JWT library with equally strict algorithm,
claim, and error-normalization behavior.

---

### Org-level permissions are a union of device answers

**What I chose:** compute the org-wide answer, then promote a permission to allow when at least one
device-specific answer allows it. Exact action checks continue to resolve against one device.
**Why:** the Phase 2 reading corrected my initial org-only model: a device-scoped control grant must
surface navigation while remaining absent from every other row. The public permission suite's
Globex case and 35/35 result exercise the exact-device half of this split.
**What I rejected:** ignoring device grants for org-level resolution. It would hide a usable
surface even though an action is available on one device.
**What would change my mind:** an API contract that defines navigation independently from device
capability instead of as the union across devices.

---

### Permission answers remain uncached until measurement justifies caching

**What I chose:** resolve from SQLite on demand and defer caching.
**Why:** grants have time windows, permission changes bump versions, and the personalized suite
changes the catalogue itself. Fresh reads passed all 53 resolution and personalization checks;
resolveDevices query growth is recorded as an open Phase 8 measurement.
**What I rejected:** a process cache keyed only by user and org. It would need invalidation for
permission-version changes and time-bound grant expiry, creating stale-authority failure modes.
**What would change my mind:** measured latency outside the stated target after the batched query
path is made constant with respect to device count.

---

### Last-owner protection is separate from ordinary rank comparison

**What I chose:** owners may modify peer owners, followed by an independent last-owner check;
other callers still require strictly greater rank than the target.
**Why:** my first uniform strict-rank implementation produced 65/66 in check-api.js: the
"demoting a NON-last owner" case returned 403. Allowing the owner peer case while retaining
assertNotLastOwner moved the suite to 66/66.
**What I rejected:** allowing every equal-rank modification. That would let admin modify admin,
which the stated authority rule explicitly refuses.
**What would change my mind:** a contract test requiring owner-to-owner changes to be rejected,
paired with another supported mechanism for reducing multiple owners.

---

### Session authority is a snapshot and account events end sessions

**What I chose:** store role and grant provenance in authorized_by at creation; role and grant
changes only stale future requests, while suspension, removal, and transfer call one shared
session-ending function.
**Why:** check-api.js observes both sides: a role demotion leaves the existing session active and
returns TOKEN_STALE on the next request, while suspension ends that same session with
user_suspended. The final API run passed all 66 assertions.
**What I rejected:** recomputing permission for a live session. It would retroactively revoke a
session on routine grant or role changes and erase the authority that admitted it.
**What would change my mind:** a product requirement for immediate revocation that also changes
the session model and its bounded-expiry contract.

---

### Successful state changes and their audit row share a transaction

**What I chose:** write successful audit events in the mutation transaction and write permission
denials once at the authorization boundary.
**Why:** check-api.js requires denied attempts with reason codes. Keeping successful writes in the
same transaction avoids an audit row claiming a change that rolled back.
**What I rejected:** a global success logger around every route. It cannot know whether a nested
transaction committed and easily produces duplicate rows.
**What would change my mind:** an outbox or event-store architecture with atomic persistence and
idempotent delivery guarantees.

## Where this repo argues with itself

### The published root and generated handout disagree about what ships

The upstream root README says BRIEF.md, PERMISSIONS.md, AUTH-DATA-MODEL.md, UI-INVENTORY.md, and
WORKFLOW.md are candidate-facing. The generated starter directory omits all five while its own
README repeatedly cites them. I treated the upstream files explicitly marked candidate-facing as
the contract. I kept them out of the submission repository because the requested deliverable is
our implementation, and recorded this choice here so the source is explicit.

The invitation says to fork or use the repository as a template, but GitHub reports that it is not
configured as a template, and a direct fork includes the organizer-only reference tree. I created
a clean repository from only the generated handout to avoid submitting reference code.

## Deliberately not built

No scope cuts yet.
