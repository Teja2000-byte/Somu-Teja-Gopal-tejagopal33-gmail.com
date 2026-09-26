import { forbidden, lastOwner, badRequest } from './http.js';
import { resolve } from './permissions.js';

// Shared domain rules: role ranks, last-owner protection, ending sessions.
//
// YOURS TO WRITE. This file ships as a stub.
//
// Put here the rules more than one route needs, so "what ends a session" has exactly
// one implementation. Sources: PERMISSIONS.md §7.2 and D8.
//
// Two traps worth naming before you start:
//   - `roles.rank` is MODIFICATION AUTHORITY ONLY. It must never answer a can()
//     question. operator and auditor are unordered by permission, and ranking them is
//     the modelling error the auditor role exists to catch.
//   - a permission change does NOT end a session in flight (grantfathering). Suspension,
//     membership removal and device transfer DO. See PERMISSIONS.md §7.

const todo = (name) =>
  Object.assign(
    new Error(`TODO: server/lifecycle.js — ${name}() is yours to write (BRIEF.md §3).`),
    { code: 'NOT_IMPLEMENTED' }
  );

export function roleRanks(db) { return Object.fromEntries(db.prepare('SELECT key,rank FROM roles').all().map((r) => [r.key, r.rank])); }
export function assertRoleExists(db, role) { if (!db.prepare('SELECT 1 FROM roles WHERE key=?').get(role)) throw badRequest('unknown role'); }
export function assertCanModify(db, callerRole, targetRole) {
  const ranks = roleRanks(db);
  const ownerPeer = callerRole === 'owner' && targetRole === 'owner';
  if (ranks[callerRole] === undefined || ranks[targetRole] === undefined || (!ownerPeer && ranks[callerRole] <= ranks[targetRole])) throw forbidden('cannot modify this role', 'role_rank');
}
export function assertNotLastOwner(db, orgId, userId) {
  const target = db.prepare("SELECT role,status FROM memberships WHERE org_id=? AND user_id=?").get(orgId, userId);
  if (target?.role === 'owner' && target.status === 'active') {
    const owners = db.prepare("SELECT count(*) n FROM memberships WHERE org_id=? AND role='owner' AND status='active'").get(orgId).n;
    if (owners <= 1) throw lastOwner();
  }
}
export function endActiveSessions(db, { orgId, userId, deviceId, reason, exceptSessionId }) {
  let sql="UPDATE sessions SET state='ended',end_reason=?,ended_at=? WHERE state IN ('connecting','active') AND org_id=?";
  const args=[reason,new Date().toISOString(),orgId];
  if(userId){sql+=' AND user_id=?';args.push(userId);} if(deviceId){sql+=' AND device_id=?';args.push(deviceId);} if(exceptSessionId){sql+=' AND id<>?';args.push(exceptSessionId);}
  return db.prepare(sql).run(...args).changes;
}
export function snapshotAuthority(db, { userId, orgId, deviceId }) {
  const result=resolve(db,{userId,orgId,deviceId});
  const grantIds=[...new Set(Object.values(result.permissions).filter((p)=>p.effect==='allow'&&p.source?.startsWith('grant:')).map((p)=>p.source.slice(6)))];
  return {role:result.role,grantIds,snapshotAt:new Date().toISOString()};
}
export function sessionExpiry(db, orgId) {
  const minutes=db.prepare('SELECT max_session_minutes FROM organizations WHERE id=? AND deleted_at IS NULL').get(orgId)?.max_session_minutes;
  if(!minutes) throw badRequest('organization has invalid session limit');
  return new Date(Date.now()+minutes*60000).toISOString();
}
