const HACKCLUB_TOKEN_URL = 'https://auth.hackclub.com/oauth/token';
const HACKCLUB_ME_URL = 'https://auth.hackclub.com/api/v1/me';
const HACKATIME_STATS_URL = (username) =>
  `https://hackatime.hackclub.com/api/v1/users/${encodeURIComponent(username)}/stats`;

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

async function handleOauthToken(request, env) {
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

  return json(
    {
      name,
      slackId: identity.slack_id ?? null,
      verificationStatus: identity.verification_status ?? null,
      yswsEligible: identity.ysws_eligible ?? false,
    },
    200,
    env
  );
}

async function handleHackatimeStats(username, env) {
  if (!username) return json({ error: 'missing username' }, 400, env);

  const res = await fetch(HACKATIME_STATS_URL(username));

  if (res.status === 404) {
    return json({ error: 'user not found' }, 404, env);
  }
  if (!res.ok) {
    return json({ error: 'hackatime lookup failed' }, 502, env);
  }

  const stats = await res.json();
  return json({ username, stats: stats.data ?? stats }, 200, env);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }

    if (request.method === 'POST' && url.pathname === '/oauth/token') {
      return handleOauthToken(request, env);
    }

    const hackatimeMatch = url.pathname.match(/^\/hackatime\/([^/]+)$/);
    if (request.method === 'GET' && hackatimeMatch) {
      return handleHackatimeStats(decodeURIComponent(hackatimeMatch[1]), env);
    }

    return json({ error: 'not found' }, 404, env);
  },
};
