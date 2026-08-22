// Blocks or unblocks a SwachhLens account (citizen or field team) from the
// Users admin page. This has to run here (service-role key, never in the
// browser bundle): actually preventing sign-in means banning the account at
// the Supabase Auth level (auth.admin.updateUserById + ban_duration), which
// the anon key has no permission to do. Mirrors `profiles.is_blocked` in the
// same call so the Users page gets an instant, realtime-subscribable status
// without needing to hit this function again just to read it.
//
// Deploy: npx supabase functions deploy set-user-blocked --project-ref <ref>
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

// GoTrue has no literal "forever" — a ~10 year ban is the standard
// stand-in for "blocked until an admin unblocks them".
const PERMANENT_BAN_DURATION = '87600h';

type Payload = { userId?: string; blocked?: boolean };

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Same "any authenticated user" gate as create-team-member — there's no
  // admin-role system yet (see admin_panel/README.md limitations).
  const authHeader = req.headers.get('Authorization') ?? '';
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
  } = await callerClient.auth.getUser();
  if (!caller) return json({ error: 'You must be signed in.' }, 401);

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const userId = payload.userId;
  const blocked = payload.blocked;
  if (!userId || typeof blocked !== 'boolean') {
    return json({ error: 'userId and blocked are required.' }, 400);
  }
  if (userId === caller.id) {
    return json({ error: "You can't block your own account." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: blocked ? PERMANENT_BAN_DURATION : 'none',
  });
  if (authError) return json({ error: authError.message }, 400);

  const { error: profileError } = await admin
    .from('profiles')
    .update({
      is_blocked: blocked,
      blocked_at: blocked ? new Date().toISOString() : null,
      blocked_by: blocked ? caller.id : null,
    })
    .eq('id', userId);
  if (profileError) return json({ error: profileError.message }, 400);

  return json({ ok: true, userId, blocked });
});
