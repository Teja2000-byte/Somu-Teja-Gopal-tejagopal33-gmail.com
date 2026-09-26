import { badRequest, forbidden } from './http.js';

export const MODE_PERMISSION={view:'device:view',control:'device:control',terminal:'device:terminal'};
const matches=(pattern,key)=>pattern==='*'||pattern===key||(pattern.endsWith(':*')&&key.startsWith(pattern.slice(0,-1)));
const denied=(catalogue,reason)=>Object.fromEntries(catalogue.map(key=>[key,{effect:'deny',source:null,reason}]));

function inputs(db,{userId,orgId,now}){
  const catalogue=db.prepare('SELECT key FROM permissions ORDER BY key').all().map(r=>r.key);
  const membership=db.prepare('SELECT role,status FROM memberships WHERE user_id=? AND org_id=?').get(userId,orgId);
  if(!membership||membership.status!=='active')return{catalogue,membership,baseline:new Set(),grants:[]};
  const baseline=new Set(db.prepare('SELECT permission FROM role_permissions WHERE role=?').all(membership.role).map(r=>r.permission));
  const at=(now instanceof Date?now:new Date(now)).toISOString();
  const grants=db.prepare('SELECT g.id,g.device_id,g.effect,gp.permission FROM grants g JOIN grant_permissions gp ON gp.grant_id=g.id WHERE g.user_id=? AND g.org_id=? AND g.revoked_at IS NULL AND (g.starts_at IS NULL OR g.starts_at<=?) AND (g.expires_at IS NULL OR ?<g.expires_at) ORDER BY g.created_at,g.id').all(userId,orgId,at,at);
  return{catalogue,membership,baseline,grants};
}

function atScope(data,deviceId){
  const applicable=data.grants.filter(g=>g.device_id===null||(deviceId!==null&&g.device_id===deviceId));
  return Object.fromEntries(data.catalogue.map(key=>{
    const denyGrant=applicable.find(g=>g.effect==='deny'&&matches(g.permission,key));
    if(denyGrant)return[key,{effect:'deny',source:'grant:'+denyGrant.id,reason:'explicit_deny'}];
    if(data.baseline.has(key))return[key,{effect:'allow',source:'role:'+data.membership.role,reason:null}];
    const allowGrant=applicable.find(g=>g.effect==='allow'&&matches(g.permission,key));
    return allowGrant?[key,{effect:'allow',source:'grant:'+allowGrant.id,reason:null}]:[key,{effect:'deny',source:null,reason:'implicit'}];
  }));
}

export function resolve(db,{userId,orgId,deviceId=null,now=new Date()}){
  const data=inputs(db,{userId,orgId,now});
  if(!data.membership)return{role:null,permissions:denied(data.catalogue,'not_a_member')};
  if(data.membership.status!=='active')return{role:data.membership.role,permissions:denied(data.catalogue,data.membership.status)};
  if(deviceId!==null)return{role:data.membership.role,permissions:atScope(data,deviceId)};
  const permissions=atScope(data,null);
  const deviceIds=db.prepare('SELECT id FROM devices WHERE org_id=? AND deleted_at IS NULL').all(orgId).map(r=>r.id);
  for(const id of deviceIds)for(const[key,answer]of Object.entries(atScope(data,id)))if(answer.effect==='allow'&&permissions[key].effect!=='allow')permissions[key]=answer;
  return{role:data.membership.role,permissions};
}

export function resolveDevices(db,{userId,orgId,deviceIds,now=new Date()}){
  const data=inputs(db,{userId,orgId,now});
  if(!data.membership)return{role:null,byDevice:Object.fromEntries(deviceIds.map(id=>[id,denied(data.catalogue,'not_a_member')]))};
  if(data.membership.status!=='active')return{role:data.membership.role,byDevice:Object.fromEntries(deviceIds.map(id=>[id,denied(data.catalogue,data.membership.status)]))};
  return{role:data.membership.role,byDevice:Object.fromEntries(deviceIds.map(id=>[id,atScope(data,id)]))};
}
export function can(db,ctx,permission,deviceId){return resolve(db,{userId:ctx.userId,orgId:ctx.orgId,deviceId:deviceId??null}).permissions[permission]?.effect==='allow'}
export function assertCan(db,ctx,permission,deviceId){const answer=resolve(db,{userId:ctx.userId,orgId:ctx.orgId,deviceId:deviceId??null}).permissions[permission];if(!answer||answer.effect!=='allow')throw forbidden('missing permission: '+permission,answer?.reason??'missing_permission');return answer}
export function assertMayGrant(db,ctx,patterns,deviceId=null){if(!Array.isArray(patterns)||!patterns.length)throw badRequest('permissions must be a non-empty array');const known=new Set(db.prepare('SELECT pattern FROM permission_patterns').all().map(r=>r.pattern)),catalogue=db.prepare('SELECT key FROM permissions').all().map(r=>r.key);for(const pattern of patterns){if(typeof pattern!=='string'||!known.has(pattern))throw badRequest('unknown permission','unknown_permission');const expanded=pattern==='*'?catalogue:pattern.endsWith(':*')?catalogue.filter(p=>p.startsWith(pattern.slice(0,-1))):[pattern];for(const permission of expanded)assertCan(db,ctx,permission,deviceId)}}
export function assertCanStartSession(db,ctx,mode,deviceId){if(!Object.hasOwn(MODE_PERMISSION,mode))throw badRequest('mode must be view, control, or terminal');const p=resolve(db,{userId:ctx.userId,orgId:ctx.orgId,deviceId}).permissions;if(p['session:start']?.effect!=='allow')throw forbidden('missing session:start','missing_permission');if(p[MODE_PERMISSION[mode]]?.effect!=='allow')throw forbidden('missing '+MODE_PERMISSION[mode],'missing_device_permission')}
