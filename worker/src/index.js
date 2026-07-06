const HACKCLUB_TOKEN_URL = 'https://auth.hackclub.com/oauth/token';
const HACKCLUB_ME_URL = 'https://auth.hackclub.com/api/v1/me';
const HACKATIME_TOKEN_URL = 'https://hackatime.hackclub.com/oauth/token';
const HACKATIME_ME_URL = 'https://hackatime.hackclub.com/api/v1/authenticated/me';

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data, status, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
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

  if (slackId) {
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
  }

  return json({ name, slackId, verificationStatus, yswsEligible }, 200, env);
}

async function handleHackatimeOauthToken(request, env) {
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

  // The access/refresh tokens never leave this worker.
  const me = await meRes.json();
  const slackId = me.slack_id ?? null;
  const githubUsername = me.github_username ?? null;
  const trustLevel = me.trust_factor?.trust_level ?? null;

  if (slackId) {
    await env.DB.prepare(
      `INSERT INTO users (slack_id, hackatime_connected, hackatime_data, updated_at)
       VALUES (?1, 1, ?2, datetime('now'))
       ON CONFLICT(slack_id) DO UPDATE SET
         hackatime_connected = 1,
         hackatime_data = excluded.hackatime_data,
         updated_at = excluded.updated_at`
    )
      .bind(slackId, JSON.stringify(me))
      .run();
  }

  return json({ githubUsername, trustLevel }, 200, env);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }

    if (request.method === 'POST' && url.pathname === '/oauth/hackclub') {
      return handleHackclubOauthToken(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/oauth/hackatime') {
      return handleHackatimeOauthToken(request, env);
    }

    return json({ error: 'not found' }, 404, env);
  },
};
