import { assertFresh, verifyAccessToken } from './auth.js';
import { forbidden, notFound, unauthenticated } from './http.js';

// Per-request context: turn a bearer token into an authenticated caller.
//
// YOURS TO WRITE. This file ships as a stub so the server boots and every
// authenticated request fails loudly instead of appearing to work.
//
// What it has to do (BRIEF.md §3, PERMISSIONS.md §6):
//   - read the bearer token, verify it with verifyAccessToken() from ./auth.js
//   - look the membership up and refuse a token whose org or membership is gone
//   - THE TOKEN'S org CLAIM IS THE ONLY ORG THE CALLER MAY ADDRESS. A request that
//     names a different org is INVISIBLE — 404, never 403. Isolation is structural:
//     the caller cannot name another org, rather than being filtered afterwards.
//   - check freshness against memberships.perm_version (AUTH-DATA-MODEL.md §3), so a
//     role or grant change takes effect on the NEXT request, not at token expiry
//   - throw through the one error path in ./http.js
//
// authenticate(db, secret) returns (req, params) => caller, where caller carries at
// least { userId, orgId, role, membership, claims }.

const todo = () =>
  Object.assign(
    new Error('TODO: server/context.js — authenticate() is yours to write (BRIEF.md §3).'),
    { code: 'NOT_IMPLEMENTED' }
  );

export function authenticate(db, secret) {
  return function buildContext(req, params) {
    const match = /^Bearer ([^ ]+)$/.exec(String(req.headers.authorization ?? ''));
    if (!match) throw unauthenticated();
    const claims = verifyAccessToken(match[1], secret);
    if (typeof claims.sub !== 'string' || !claims.sub || typeof claims.org !== 'string' || !claims.org) throw unauthenticated('invalid access token');
    if (params.org !== undefined && params.org !== claims.org) throw notFound();
    const membership = db.prepare('SELECT m.*, u.email, u.name AS user_name, o.name AS org_name, o.theme AS org_theme FROM memberships m JOIN users u ON u.id=m.user_id JOIN organizations o ON o.id=m.org_id AND o.deleted_at IS NULL WHERE m.user_id=? AND m.org_id=?').get(claims.sub, claims.org);
    assertFresh(claims, membership);
    if (membership.status === 'removed') throw unauthenticated('membership removed');
    if (membership.status !== 'active') throw forbidden('membership is suspended', 'suspended');
    if (claims.role !== membership.role) throw unauthenticated('invalid access token');
    return { userId: claims.sub, orgId: claims.org, role: membership.role, membership, claims };
  };
}
