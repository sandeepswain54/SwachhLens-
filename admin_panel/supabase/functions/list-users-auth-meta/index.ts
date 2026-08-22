// Returns real auth-level metadata (last sign-in time, current ban status)
// for every SwachhLens account, keyed by user id. `profiles` mirrors ban
// status for realtime/RLS-friendly reads (see 005_users_page.sql), but
// `last_sign_in_at` only exists in `auth.users`, which the anon key can't
// read — hence this read-only, service-role edge function. Best-effort: the
// Users page falls back to profiles-only data if this call fails.
//
// Deploy: npx supabase functions deploy list-users-auth-meta --project-ref <ref>
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

type AuthMeta = { id: string; lastSignInAt: string | null; bannedUntil: string | null };

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
  } = await callerClient.auth.getUser();
  if (!caller) return json({ error: 'You must be signed in.' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const users: AuthMeta[] = [];
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return json({ error: error.message }, 400);
    for (const u of data.users) {
      users.push({ id: u.id, lastSignInAt: u.last_sign_in_at ?? null, bannedUntil: u.banned_until ?? null });
    }
    if (data.users.length < perPage) break;
    page += 1;
  }

  return json({ users });
});
