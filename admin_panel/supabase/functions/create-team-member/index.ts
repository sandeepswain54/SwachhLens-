// Creates a real Supabase Auth login for a cleanup team, plus its `teams`
// row. This has to run here (service-role key, never in the browser bundle)
// rather than from the admin panel directly — the anon key has no
// permission to create other users' auth accounts, and shipping the
// service-role key to a client app would let anyone with devtools do the
// same to every account in the project.
//
// Deploy: npx supabase functions deploy create-team-member --project-ref <ref>
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

type CreateTeamPayload = {
  team_name?: string;
  leader_name?: string;
  email?: string;
  password?: string;
  zone?: string;
  phone?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Require the caller to be a signed-in admin-panel user. There's no
  // separate admin-role system yet (see admin_panel/README.md limitations),
  // so this only rules out anonymous callers, matching every other table's
  // RLS policy in this project today.
  const authHeader = req.headers.get('Authorization') ?? '';
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
  } = await callerClient.auth.getUser();
  if (!caller) return json({ error: 'You must be signed in to create a team.' }, 401);

  let payload: CreateTeamPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const team_name = payload.team_name?.trim();
  const leader_name = payload.leader_name?.trim();
  const email = payload.email?.trim().toLowerCase();
  const password = payload.password ?? '';
  const zone = payload.zone?.trim() || 'Zone-1';
  const phone = payload.phone?.trim() || null;

  if (!team_name) return json({ error: 'Team name is required.' }, 400);
  if (!leader_name) return json({ error: 'Team leader name is required.' }, 400);
  if (!email || !EMAIL_RE.test(email)) return json({ error: 'A valid email is required.' }, 400);
  if (!password || password.length < 6) {
    return json({ error: 'Password must be at least 6 characters.' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'team', full_name: leader_name, team_name },
  });

  if (createError || !created.user) {
    const message = createError?.message.includes('already been registered')
      ? 'A user with this email already exists.'
      : (createError?.message ?? 'Could not create the login.');
    return json({ error: message }, 400);
  }

  const { data: team, error: insertError } = await admin
    .from('teams')
    .insert({
      team_name,
      leader_name,
      email,
      phone,
      zone,
      auth_user_id: created.user.id,
      created_by: caller.id,
    })
    .select('id, team_code, team_name, email')
    .single();

  if (insertError || !team) {
    // Compensate: don't leave an orphaned auth user with no team row.
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: insertError?.message ?? 'Could not save the team.' }, 400);
  }

  return json({ team });
});
