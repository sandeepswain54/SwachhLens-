// Starts a Stripe Checkout (test mode) session for a municipality's chosen
// plan. Runs here (never in the browser) because it needs the Stripe
// *secret* key — the publishable key is the only Stripe key allowed
// client-side, and this flow doesn't even need that: the client just gets
// redirected to Stripe's own hosted checkout page.
//
// Called from Public Page/municipality-status.js when a municipality clicks
// "Choose <Plan>". On success the municipality lands back on
// municipality-status.html, which calls confirm-payment to verify and
// activate the plan.
//
// Deploy: npx supabase functions deploy create-checkout-session --project-ref <ref>
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

// Same plans/prices shown on municipality-status.html — kept here too since
// the amount actually charged must come from the server, not the client.
const PLANS: Record<string, { name: string; amountPaise: number }> = {
  basic: { name: 'Basic Plan (SwachhLens)', amountPaise: 24_000_00 },
  standard: { name: 'Standard Plan (SwachhLens)', amountPaise: 60_000_00 },
  smart_city: { name: 'Smart City Plan (SwachhLens)', amountPaise: 1_20_000_00 },
};

type Payload = {
  registration_id?: string;
  plan?: string;
  origin?: string; // e.g. "http://127.0.0.1:8080" so success/cancel URLs point back at the right host
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) return json({ error: 'Payments are not configured yet.' }, 500);

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const registrationId = payload.registration_id?.trim();
  const plan = payload.plan?.trim();
  const origin = (payload.origin || '').replace(/\/$/, '');
  if (!registrationId) return json({ error: 'registration_id is required.' }, 400);
  if (!plan || !PLANS[plan]) return json({ error: 'A valid plan is required.' }, 400);
  if (!origin) return json({ error: 'origin is required.' }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Look the registration up ourselves rather than trusting client-supplied
  // details — only an approved registration should be payable.
  const { data: registration, error: fetchError } = await admin
    .from('municipality_registrations')
    .select('id, status, official_email, municipality_name, payment_status')
    .eq('id', registrationId)
    .maybeSingle();

  if (fetchError || !registration) return json({ error: 'Registration not found.' }, 404);
  if (registration.status !== 'approved') {
    return json({ error: 'Your registration must be approved before choosing a plan.' }, 400);
  }
  if (registration.payment_status === 'paid') {
    return json({ error: 'A plan is already active for this registration.' }, 400);
  }

  const planInfo = PLANS[plan];

  // Stripe's API is just HTTPS + form-encoding — calling it directly avoids
  // needing an npm/Deno Stripe SDK for one endpoint.
  const body = new URLSearchParams({
    mode: 'payment',
    'payment_method_types[0]': 'card',
    customer_email: registration.official_email,
    success_url: `${origin}/municipality-status.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/municipality-status.html?payment=cancelled`,
    'line_items[0][price_data][currency]': 'inr',
    'line_items[0][price_data][unit_amount]': String(planInfo.amountPaise),
    'line_items[0][price_data][product_data][name]': planInfo.name,
    'line_items[0][price_data][product_data][description]': `${registration.municipality_name} — annual subscription`,
    'line_items[0][quantity]': '1',
    'metadata[registration_id]': registrationId,
    'metadata[plan]': plan,
  });

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const stripeData = await stripeRes.json();
  if (!stripeRes.ok) {
    return json({ error: stripeData?.error?.message ?? 'Could not start checkout.' }, 400);
  }

  return json({ url: stripeData.url });
});
