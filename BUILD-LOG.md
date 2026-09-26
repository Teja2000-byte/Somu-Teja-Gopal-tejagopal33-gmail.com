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

_What did you expect each failure mode to look like before you ran it? Which one behaved
differently from your expectation, and what did that tell you?_

## Phase 2 — caller context and the resolution engine

_This is where most people's first model is wrong. Write down the model you started with, the
observation that broke it, and the model you moved to. Be specific about the observation._

## Phase 3 — orgs, members, invites

_Anything you had to work out that no document states. Invite lifecycle states are a common
source of this._

## Phase 4 — devices and grants

_What happens at the boundary where two grants disagree, or where a grant's scope and the
question's scope differ? Say what you predicted and what you got._

## Phase 5 — sessions

_Two permissions, one device. What did you have to resolve, and in what order, to keep the two
failure reasons distinguishable?_

## Phase 6 — audit

_What did you decide counts as an auditable event, and what pushed you to that line?_

## Phase 7 — the console

_Where did the server's answer and your instinct disagree about what should be on screen?_

## Phase 8 — hardening

_What did you measure, what did you fix, and what did you deliberately leave alone? Anything you
chose not to build belongs here with its reason._

## Open threads

_Things you know are wrong, unfinished, or that you would do differently with another day. Listing
these honestly is worth more than pretending they do not exist — we will find them anyway._
