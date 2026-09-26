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
