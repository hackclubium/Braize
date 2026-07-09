const HACKCLUB_TOKEN_URL = 'https://auth.hackclub.com/oauth/token';
const HACKCLUB_ME_URL = 'https://auth.hackclub.com/api/v1/me';
const HACKATIME_TOKEN_URL = 'https://hackatime.hackclub.com/oauth/token';
const HACKATIME_ME_URL = 'https://hackatime.hackclub.com/api/v1/authenticated/me';
const HACKATIME_USER_URL = 'https://hackatime.hackclub.com/api/v1/users';

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function json(data, status, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
}

async function requireUser(request, env) {
  const auth = request.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  const row = await env.DB.prepare(
    `SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ?1`
  )
    .bind(token)
    .first();

  return row ?? null;
}

async function handleHackclubOauthToken(request, env) {
  const { code } = await request.json();
  if (!code) return json({ error: 'missing code' }, 400, env);

  const tokenRes = await fetch(HACKCLUB_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.HACKCLUB_AUTH_CLIENT_ID,
      client_secret: env.HACKCLUB_AUTH_CLIENT_SECRET,
      redirect_uri: env.HACKCLUB_AUTH_REDIRECT_URI,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return json({ error: 'token exchange failed' }, 502, env);
  }

  const { access_token: accessToken } = await tokenRes.json();

  const meRes = await fetch(HACKCLUB_ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!meRes.ok) {
    return json({ error: 'profile fetch failed' }, 502, env);
  }

  const { identity } = await meRes.json();

  // Only pass back what the UI needs. The access/refresh tokens never
  // leave this worker.
  const name = [identity.first_name, identity.last_name].filter(Boolean).join(' ') || null;
  const slackId = identity.slack_id ?? null;
  const verificationStatus = identity.verification_status ?? null;
  const yswsEligible = identity.ysws_eligible ?? false;

  if (!slackId) {
    return json({ error: 'no slack_id on identity' }, 502, env);
  }

  await env.DB.prepare(
    `INSERT INTO users (slack_id, name, verification_status, ysws_eligible, updated_at)
     VALUES (?1, ?2, ?3, ?4, datetime('now'))
     ON CONFLICT(slack_id) DO UPDATE SET
       name = excluded.name,
       verification_status = excluded.verification_status,
       ysws_eligible = excluded.ysws_eligible,
       updated_at = excluded.updated_at`
  )
    .bind(slackId, name, verificationStatus, yswsEligible ? 1 : 0)
    .run();

  const user = await env.DB.prepare(`SELECT id FROM users WHERE slack_id = ?1`).bind(slackId).first();

  const sessionToken = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO sessions (token, user_id) VALUES (?1, ?2)`)
    .bind(sessionToken, user.id)
    .run();

  return json({ name, slackId, verificationStatus, yswsEligible, sessionToken }, 200, env);
}

async function handleHackatimeOauthToken(request, env) {
  const user = await requireUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401, env);

  const { code } = await request.json();
  if (!code) return json({ error: 'missing code' }, 400, env);

  const tokenRes = await fetch(HACKATIME_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.HACKATIME_OAUTH_CLIENT_ID,
      client_secret: env.HACKATIME_OAUTH_CLIENT_SECRET,
      redirect_uri: env.HACKATIME_OAUTH_REDIRECT_URI,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return json({ error: 'token exchange failed' }, 502, env);
  }

  const { access_token: accessToken } = await tokenRes.json();

  const meRes = await fetch(HACKATIME_ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!meRes.ok) {
    return json({ error: 'profile fetch failed' }, 502, env);
  }

  const me = await meRes.json();
  const githubUsername = me.github_username ?? null;
  const trustLevel = me.trust_factor?.trust_level ?? null;

  // Access token is kept so later requests can pull per-project stats.
  await env.DB.prepare(
    `UPDATE users SET hackatime_connected = 1, hackatime_data = ?1, hackatime_access_token = ?2, updated_at = datetime('now')
     WHERE id = ?3`
  )
    .bind(JSON.stringify(me), accessToken, user.id)
    .run();

  return json({ githubUsername, trustLevel }, 200, env);
}

function getHackatimeUsername(user) {
  if (!user.hackatime_data) return null;
  try {
    const data = JSON.parse(user.hackatime_data);
    return data.username ?? data.github_username ?? null;
  } catch {
    return null;
  }
}

async function getOwnedProject(env, user, projectId) {
  const project = await env.DB.prepare(`SELECT * FROM projects WHERE id = ?1`).bind(projectId).first();
  if (!project || project.user_id !== user.id) return null;
  return project;
}

async function handleListProjects(user, env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM projects WHERE user_id = ?1 ORDER BY created_at DESC`
  )
    .bind(user.id)
    .all();
  return json({ projects: results }, 200, env);
}

async function handleCreateProject(request, user, env) {
  const { name, description = null, repo_url = null, category = null } = await request.json();
  if (!name) return json({ error: 'name required' }, 400, env);

  const { meta } = await env.DB.prepare(
    `INSERT INTO projects (user_id, name, description, repo_url, category) VALUES (?1, ?2, ?3, ?4, ?5)`
  )
    .bind(user.id, name, description, repo_url, category)
    .run();

  const project = await env.DB.prepare(`SELECT * FROM projects WHERE id = ?1`).bind(meta.last_row_id).first();
  return json({ project }, 201, env);
}

async function handleUpdateProject(request, user, env, projectId) {
  const project = await getOwnedProject(env, user, projectId);
  if (!project) return json({ error: 'not found' }, 404, env);

  const body = await request.json();
  const fields = ['name', 'description', 'repo_url', 'category', 'status', 'hackatime_project_name'];
  const updates = fields.filter((f) => f in body);
  if (updates.length === 0) return json({ error: 'nothing to update' }, 400, env);

  const setClause = updates.map((f, i) => `${f} = ?${i + 1}`).join(', ');
  await env.DB.prepare(
    `UPDATE projects SET ${setClause}, updated_at = datetime('now') WHERE id = ?${updates.length + 1}`
  )
    .bind(...updates.map((f) => body[f]), projectId)
    .run();

  const updated = await env.DB.prepare(`SELECT * FROM projects WHERE id = ?1`).bind(projectId).first();
  return json({ project: updated }, 200, env);
}

async function handleDeleteProject(user, env, projectId) {
  const project = await getOwnedProject(env, user, projectId);
  if (!project) return json({ error: 'not found' }, 404, env);

  await env.DB.prepare(`DELETE FROM journal_entries WHERE project_id = ?1`).bind(projectId).run();
  await env.DB.prepare(`DELETE FROM projects WHERE id = ?1`).bind(projectId).run();
  return json({ ok: true }, 200, env);
}

async function handleListJournal(user, env, projectId) {
  const project = await getOwnedProject(env, user, projectId);
  if (!project) return json({ error: 'not found' }, 404, env);

  const { results } = await env.DB.prepare(
    `SELECT * FROM journal_entries WHERE project_id = ?1 ORDER BY created_at DESC`
  )
    .bind(projectId)
    .all();
  return json({ entries: results }, 200, env);
}

async function handleCreateJournal(request, user, env, projectId) {
  const project = await getOwnedProject(env, user, projectId);
  if (!project) return json({ error: 'not found' }, 404, env);

  const { title = null, body: entryBody } = await request.json();
  if (!entryBody) return json({ error: 'body required' }, 400, env);

  const { meta } = await env.DB.prepare(
    `INSERT INTO journal_entries (project_id, title, body) VALUES (?1, ?2, ?3)`
  )
    .bind(projectId, title, entryBody)
    .run();

  const entry = await env.DB.prepare(`SELECT * FROM journal_entries WHERE id = ?1`).bind(meta.last_row_id).first();
  return json({ entry }, 201, env);
}

async function getOwnedJournalEntry(env, user, entryId) {
  const entry = await env.DB.prepare(
    `SELECT journal_entries.* FROM journal_entries
     JOIN projects ON projects.id = journal_entries.project_id
     WHERE journal_entries.id = ?1 AND projects.user_id = ?2`
  )
    .bind(entryId, user.id)
    .first();
  return entry ?? null;
}

async function handleUpdateJournal(request, user, env, entryId) {
  const entry = await getOwnedJournalEntry(env, user, entryId);
  if (!entry) return json({ error: 'not found' }, 404, env);

  const body = await request.json();
  const fields = ['title', 'body'];
  const updates = fields.filter((f) => f in body);
  if (updates.length === 0) return json({ error: 'nothing to update' }, 400, env);

  const setClause = updates.map((f, i) => `${f} = ?${i + 1}`).join(', ');
  await env.DB.prepare(`UPDATE journal_entries SET ${setClause} WHERE id = ?${updates.length + 1}`)
    .bind(...updates.map((f) => body[f]), entryId)
    .run();

  const updated = await env.DB.prepare(`SELECT * FROM journal_entries WHERE id = ?1`).bind(entryId).first();
  return json({ entry: updated }, 200, env);
}

async function handleDeleteJournal(user, env, entryId) {
  const entry = await getOwnedJournalEntry(env, user, entryId);
  if (!entry) return json({ error: 'not found' }, 404, env);

  await env.DB.prepare(`DELETE FROM journal_entries WHERE id = ?1`).bind(entryId).run();
  return json({ ok: true }, 200, env);
}

async function handleHackatimeStats(user, env, projectId) {
  const project = await getOwnedProject(env, user, projectId);
  if (!project) return json({ error: 'not found' }, 404, env);
  if (!project.hackatime_project_name) return json({ error: 'no hackatime project linked' }, 400, env);
  if (!user.hackatime_access_token) return json({ error: 'hackatime not connected' }, 400, env);
  const username = getHackatimeUsername(user);
  if (!username) return json({ error: 'hackatime username missing; reconnect hackatime' }, 400, env);

  const params = new URLSearchParams({
    filter_by_project: project.hackatime_project_name,
    total_seconds: 'true',
  });
  const statsRes = await fetch(`${HACKATIME_USER_URL}/${encodeURIComponent(username)}/stats?${params.toString()}`, {
    headers: { Authorization: `Bearer ${user.hackatime_access_token}` },
  });

  if (!statsRes.ok) return json({ error: 'hackatime stats fetch failed' }, 502, env);

  const stats = await statsRes.json();
  const totalSeconds = stats.total_seconds ?? stats.data?.total_seconds ?? 0;
  return json({ totalSeconds }, 200, env);
}

async function handleListHackatimeProjects(user, env) {
  if (!user.hackatime_access_token) return json({ error: 'hackatime not connected' }, 400, env);
  const username = getHackatimeUsername(user);
  if (!username) return json({ error: 'hackatime username missing; reconnect hackatime' }, 400, env);

  const res = await fetch(`${HACKATIME_USER_URL}/${encodeURIComponent(username)}/projects`, {
    headers: { Authorization: `Bearer ${user.hackatime_access_token}` },
  });

  if (!res.ok) return json({ error: 'hackatime project list fetch failed' }, 502, env);

  const body = await res.json();
  const raw = Array.isArray(body) ? body : body.projects ?? body.data ?? [];

  const projects = raw
    .filter(Boolean)
    .map((p) => ({
      name: typeof p === 'string' ? p : p.name,
      totalSeconds: typeof p === 'string' ? 0 : p.total_seconds ?? 0,
      lastHeartbeatAt: typeof p === 'string' ? null : p.last_heartbeat_at ?? p.updated_at ?? null,
    }))
    .filter((p) => p.name)
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  return json({ projects }, 200, env);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }

    if (request.method === 'POST' && pathname === '/oauth/hackclub') {
      return handleHackclubOauthToken(request, env);
    }

    if (request.method === 'POST' && pathname === '/oauth/hackatime') {
      return handleHackatimeOauthToken(request, env);
    }

    // Everything below requires a session.
    const user = await requireUser(request, env);

    if (pathname === '/projects') {
      if (!user) return json({ error: 'unauthorized' }, 401, env);
      if (request.method === 'GET') return handleListProjects(user, env);
      if (request.method === 'POST') return handleCreateProject(request, user, env);
    }

    let match = pathname.match(/^\/projects\/(\d+)$/);
    if (match) {
      if (!user) return json({ error: 'unauthorized' }, 401, env);
      const projectId = match[1];
      if (request.method === 'PATCH') return handleUpdateProject(request, user, env, projectId);
      if (request.method === 'DELETE') return handleDeleteProject(user, env, projectId);
    }

    match = pathname.match(/^\/projects\/(\d+)\/journal$/);
    if (match) {
      if (!user) return json({ error: 'unauthorized' }, 401, env);
      const projectId = match[1];
      if (request.method === 'GET') return handleListJournal(user, env, projectId);
      if (request.method === 'POST') return handleCreateJournal(request, user, env, projectId);
    }

    match = pathname.match(/^\/journal\/(\d+)$/);
    if (match) {
      if (!user) return json({ error: 'unauthorized' }, 401, env);
      const entryId = match[1];
      if (request.method === 'PATCH') return handleUpdateJournal(request, user, env, entryId);
      if (request.method === 'DELETE') return handleDeleteJournal(user, env, entryId);
    }

    match = pathname.match(/^\/projects\/(\d+)\/hackatime-stats$/);
    if (match) {
      if (!user) return json({ error: 'unauthorized' }, 401, env);
      if (request.method === 'GET') return handleHackatimeStats(user, env, match[1]);
    }

    if (pathname === '/hackatime/projects' && request.method === 'GET') {
      if (!user) return json({ error: 'unauthorized' }, 401, env);
      return handleListHackatimeProjects(user, env);
    }

    return json({ error: 'not found' }, 404, env);
  },
};
