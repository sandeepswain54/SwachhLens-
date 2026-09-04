// Creates a municipality's Auth login (pre-confirmed, so it can sign in
// immediately with no email step — see login.js/register.js on the public
// site) plus its `municipality_registrations` row, in one atomic-ish call.
//
// This has to run here (service-role key, never in the browser bundle)
// rather than from "Public Page/register.js" directly: only the Auth Admin
// API can create an already-confirmed user (`email_confirm: true`), and the
// anon key can't call it.
//
// Unlike create-team-member, this is called by an anonymous visitor
// (nobody is signed in yet — they're registering), matching the open
// "Anyone can submit a municipality registration" policy on the table.
//
// Deploy: npx supabase functions deploy register-municipality --project-ref <ref>
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

type RegisterPayload = {
  id?: string;
  email?: string;
  password?: string;
  municipality_name?: string;
  state?: string;
  district?: string;
  current_location?: string;
  latitude?: number | null;
  longitude?: number | null;
  municipality_type?: string;
  municipality_code?: string;
  designation?: string;
  contact_number?: string;
  authorization_document_url?: string | null;
  municipality_image_url?: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  let payload: RegisterPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password ?? '';
  const municipality_name = payload.municipality_name?.trim();
  const state = payload.state?.trim();
  const district = payload.district?.trim();
  const current_location = payload.current_location?.trim();
  const municipality_type = payload.municipality_type?.trim();
  const municipality_code = payload.municipality_code?.trim();
  const designation = payload.designation?.trim();
  const contact_number = payload.contact_number?.trim();

  if (!email || !EMAIL_RE.test(email)) return json({ error: 'A valid email is required.' }, 400);
  if (!password || password.length < 6) {
    return json({ error: 'Password must be at least 6 characters.' }, 400);
  }
  if (!municipality_name) return json({ error: 'Municipality name is required.' }, 400);
  if (!state) return json({ error: 'State is required.' }, 400);
  if (!district) return json({ error: 'District is required.' }, 400);
  if (!current_location) return json({ error: 'Current location is required.' }, 400);
  if (!municipality_type) return json({ error: 'Municipality type is required.' }, 400);
  if (!municipality_code) return json({ error: 'Municipality code is required.' }, 400);
  if (!designation) return json({ error: 'Designation is required.' }, 400);
  if (!contact_number) return json({ error: 'Contact number is required.' }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // 1. Create the login, already confirmed — municipalities sign in with
  // the credentials they set here, no confirmation email involved.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'municipality', municipality_name },
  });

  if (createError || !created.user) {
    const message = createError?.message.includes('already been registered')
      ? 'An account with this email already exists. Please sign in instead, or use a different email.'
      : (createError?.message ?? 'Could not create the login.');
    return json({ error: message }, 400);
  }

  // 2. Store the registration, linked to that login.
  const { data: registration, error: insertError } = await admin
    .from('municipality_registrations')
    .insert({
      id: payload.id, // client-generated, so uploaded document paths already match
      user_id: created.user.id,
      municipality_name,
      state,
      district,
      current_location,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      municipality_type,
      municipality_code,
      official_email: email,
      designation,
      contact_number,
      authorization_document_url: payload.authorization_document_url ?? null,
      municipality_image_url: payload.municipality_image_url ?? null,
    })
    .select('id')
    .single();

  if (insertError || !registration) {
    // Compensate: don't leave an orphaned auth user with no registration row.
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: insertError?.message ?? 'Could not save the registration.' }, 400);
  }

  return json({ id: registration.id });
});
