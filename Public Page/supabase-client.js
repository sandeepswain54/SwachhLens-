// ===== Shared Supabase client for the SwachhLens public site =====
// Same project/anon key used by the mobile app and admin_panel (see the
// root .env / admin_panel/.env). The anon key is safe to ship in client
// code — access is controlled by the RLS policies in
// admin_panel/supabase/011_municipality_registrations.sql.
(function () {
  var SUPABASE_URL = "https://mdkdlvvqalsrfktfghiq.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_9HrPgHX9kQSCoFuuILCxJA_J_UXIr0R";

  if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase JS library did not load before supabase-client.js");
    return;
  }

  window.swachhlensDb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
})();
