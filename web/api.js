let accessToken = null;
export const setAccessToken = (token) => { accessToken = token; };
export async function api(path, options = {}) {
  const headers = { ...(options.body ? { 'content-type': 'application/json' } : {}), ...options.headers };
  if (accessToken) headers.authorization = 'Bearer ' + accessToken;
  const response = await fetch('/v1' + path, { ...options, credentials: 'same-origin', headers, body: options.body ? JSON.stringify(options.body) : undefined });
  const text = await response.text(); const data = text ? JSON.parse(text) : null;
  if (!response.ok) { const error = new Error(data?.error?.message ?? 'Request failed'); Object.assign(error, data?.error ?? {}, { status: response.status }); throw error; }
  return data;
}
export async function refreshSession() { const session=await api('/auth/refresh',{method:'POST'});setAccessToken(session.token);return session; }
