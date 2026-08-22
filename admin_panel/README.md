# SwachhLens Admin Panel

A web dashboard for city staff, wired to the **same Supabase project** as the
SwachhLens mobile app. Any report a citizen submits (or a status change made
elsewhere) shows up here within a second or two via Supabase Realtime — no
refresh needed.

## One-time setup

1. **Run the SQL migrations.** Open the Supabase SQL editor for the project
   (or use `npx supabase db query --linked --file supabase/<file>.sql` once
   `npx supabase link --project-ref <ref>` has been run). Both are safe to
   re-run:
   - [`supabase/001_admin_dashboard.sql`](supabase/001_admin_dashboard.sql) —
     adds `reports.resolved_at` (auto-set by a trigger so "Average Resolution
     Time" is real, not approximated), turns on realtime for `reports`, and
     adds an "authenticated users can view all reports" policy.
   - [`supabase/002_teams_assignments.sql`](supabase/002_teams_assignments.sql)
     — adds the `teams` and `assignments` tables behind the Teams &
     Assignments page (auto-generated `TEAM-01`/`ASN-1200`-style codes,
     realtime, and a trigger that keeps a report's `status` in sync with its
     assignment automatically).
   - [`supabase/003_complaints_page.sql`](supabase/003_complaints_page.sql) —
     adds a `profiles` table (auto-populated from `auth.users` via trigger,
     so "Reported By" can show a real name) and `reports.escalated`, plus two
     narrowly-scoped functions (`set_report_escalated`, `mark_report_resolved`)
     behind the Complaints page's Escalate / Mark Resolved actions.
2. **Deploy the `create-team-member` edge function** (already done for the
   live project — only needed again if you're pointing this at a different
   Supabase project):
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase functions deploy create-team-member --project-ref <ref>
   ```
   This has to be an edge function, not a client-side call: creating another
   user's login needs the service-role key, which must never ship in the
   browser bundle. It runs with that key server-side only, and refuses
   unauthenticated callers.
3. **Install & configure:**
   ```bash
   cd admin_panel
   npm install
   cp .env.example .env   # fill in Supabase + EmailJS credentials
   npm run dev
   ```
4. **Sign in** at `http://localhost:5173` with any existing SwachhLens
   account's email/password (the same one used in the mobile app). There's no
   separate admin role yet — anyone with an app account can currently sign in
   here (see Limitations).

## What's implemented (Dashboard page)

Everything below reads live from the `reports` table and updates in
realtime as rows are inserted/updated:

- **Stat cards** — Total / Active / Resolved / In Progress / Critical-High,
  each with a real week-over-week delta reconstructed from `created_at`,
  `resolved_at`, and `severity_label` (all immutable-once-written facts).
- **Complaints Trend** — cumulative Total/Resolved/Active over the last 7 days.
- **Complaints by Category** — top 5 categories + "Others", fixed slice order
  (not re-sorted by live count — see the color-palette note below).
- **Complaints by Severity** — Critical/High/Medium/Low, using the app's
  fixed status color scale.
- **Waste Hotspots Map** — free OpenStreetMap tiles via Leaflet, with
  `leaflet.markercluster` bubbling nearby reports into a count marker that
  splits apart as you zoom in; a severity filter and a fullscreen toggle sit
  above it.
- **Recent Alerts / Recent Activity / Latest Complaints** — built from the
  same live report stream (Recent Activity only shows events from the
  current browser session — see Limitations).

## Teams & Assignments page

Everything on this page reads and writes real Supabase tables and updates
live (via the same `postgres_changes` realtime pattern as the Dashboard):

- **Add Team** creates a real login, not just a database row: it calls the
  `create-team-member` edge function (service-role, see above), which
  creates a Supabase Auth user (`email_confirm: true`, so no confirmation
  email is required) and the matching `teams` row in one step, auto-assigning
  a `TEAM-01`-style code. That same email/password works immediately in the
  mobile app's **Field Team** sign-in tab — it's a real `auth.users` account,
  same as a citizen's.
- The credentials are then emailed to the team via EmailJS
  (`src/lib/emailjs.ts`), client-side, using the service/template/public key
  in `.env`. **The template variable names in that file
  (`to_email`/`team_name`/`leader_name`/`team_code`/`password`) are a guess**
  — if your EmailJS template uses different placeholder names, that's the one
  file to edit. If sending fails, team creation still succeeds; the modal
  shows the credentials so you can share them manually.
- **All Teams** / **Team Details** / **Team Workload** are all computed from
  the team's actual `assignments` (current workload = active assignments ÷ a
  per-team `daily_capacity`, default 6/day).
- **Team Location** is centered on the average position of a team's currently
  active assigned complaints (real, updates as assignments change) — not GPS
  tracking, since the mobile app doesn't send a location ping. Falls back to
  a static per-zone center when a team has no active assignments yet.
- **Active Assignments** is built directly from recent `reports`, joined with
  their `assignments` row if one exists. Assigning a team to a brand new
  complaint (or reassigning it) is done right from this table — no separate
  "new assignment" flow. A DB trigger keeps the linked report's `status`
  (submitted → team_assigned → in_progress → resolved) in sync automatically,
  so this page and the Dashboard never disagree.
- **Assigned Vehicle** is a free-text field typed in at assignment time —
  there's no fleet/vehicles table yet (the Vehicles nav page is still a
  placeholder), so this is a lightweight stand-in rather than a fabricated
  fleet module.

## Complaints page

Everything here reads and writes the real `reports`/`assignments`/`profiles`
tables and updates live, same realtime pattern as the other pages:

- **All Complaints** table — tabs (All/New/Pending/In Progress/Resolved/
  Escalated/Duplicates) plus Status/Priority/Category/Location/Date Range
  filters, a checkbox column with real bulk Escalate/Mark Resolved actions,
  and pagination. "Duplicates" and per-row Priority come from the AI
  analysis and severity already stored on each report; "Location" groups
  reports by a best-effort locality parsed out of the free-text reverse-
  geocoded address (there's no dedicated zone column on `reports`).
- **Complaint Details** panel — Details / AI Analysis / Timeline / Assignment
  / History tabs for whichever complaint is selected. AI Analysis renders
  the actual Gemini output stored in `reports.analysis` (waste category,
  volume estimate, severity gauge, duplicate check) — complaints submitted
  before that column existed show an explicit "not available" state rather
  than a fabricated one. Assignment reuses the same `assignTeamToReport` /
  `updateAssignmentStatus` calls as the Teams & Assignments page.
- **Escalate** and **Mark Resolved** call the two functions added in
  `003_complaints_page.sql` — see that file's comments for why they're
  SECURITY DEFINER functions rather than a direct table update.

## Known limitations (by design, for this pass)

- **No admin roles** — sign-in accepts any SwachhLens account (citizen or
  team), matching the RLS policy the mobile app's community map already
  relies on. Add a real admin-role check before giving this URL to anyone
  outside your team, and before letting field teams create other teams.
- **Mobile "Field Team" login** now actually signs in (it was previously a
  no-op stub), but it lands on the same citizen tabs as everyone else — there
  is no dedicated field-team mobile screen (task list, status updates, etc.)
  yet. That's a separate, bigger piece of mobile-app work.
- **Complaint Location filter** is a heuristic (parsed from the reverse-
  geocoded address string), not a real zone/ward field.
- **Recent Activity** (on both pages) is session-only (it's driven by
  realtime events seen while the tab is open), not a persisted audit log.

## Color palette

Chart colors were chosen and validated with the dataviz skill's
`validate_palette.js` (CVD-safe adjacency, contrast, etc.) — see
`src/lib/palette.ts` for the chosen hex values and why. The category donut's
slice order is deliberately fixed rather than sorted by live count, both to
keep the validated color-adjacency guarantee and to avoid the donut visually
jittering as counts change in realtime.
