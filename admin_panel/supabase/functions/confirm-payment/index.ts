// Verifies a Stripe Checkout session server-side (using the secret key —
// never trust a client's word that "payment succeeded") and, once Stripe
// confirms it's actually paid, activates the plan on the registration.
// This is what actually unlocks admin_panel access — see
// admin_panel/src/contexts/AuthContext.tsx, which checks payment_status.
//
// Called from Public Page/municipality-status.js right after Stripe
// redirects the municipality back with ?session_id=....
//
// Deploy: npx supabase functions deploy confirm-payment --project-ref <ref>
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) return json({ error: 'Payments are not configured yet.' }, 500);

  let payload: { session_id?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const sessionId = payload.session_id?.trim();
  if (!sessionId) return json({ error: 'session_id is required.' }, 400);

  const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
  });
  const session = await stripeRes.json();
  if (!stripeRes.ok) {
    return json({ error: session?.error?.message ?? 'Could not verify payment.' }, 400);
  }

  const registrationId = session.metadata?.registration_id;
  const plan = session.metadata?.plan;
  if (!registrationId || !plan) return json({ error: 'This checkout session is missing registration details.' }, 400);

  if (session.payment_status !== 'paid') {
    return json({ error: 'not_paid', payment_status: session.payment_status }, 200);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: registration, error: updateError } = await admin
    .from('municipality_registrations')
    .update({
      plan,
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_session_id: sessionId,
    })
    .eq('id', registrationId)
    .select()
    .single();

  if (updateError || !registration) {
    return json({ error: updateError?.message ?? 'Could not activate the plan.' }, 400);
  }

  return json({ registration });
});
