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

  // The access/refresh tokens never leave this worker. Pass through
  // whatever identity fields the endpoint returns; exact shape gets
  // confirmed against a real response once this is deployed.
  const me = await meRes.json();

  return json(me, 200, env);
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
