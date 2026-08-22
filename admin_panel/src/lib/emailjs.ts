import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;

export type TeamCredentialsEmail = {
  to_email: string;
  team_name: string;
  leader_name: string;
  team_code: string;
  password: string;
};

// Sends the freshly-created team's login credentials via EmailJS (a
// browser-side send, using the public key — no backend needed for this
// part, unlike account creation).
//
// NOTE: these template variable names (to_email, team_name, leader_name,
// team_code, password, app_name) are a best guess — if your EmailJS
// template (template_wnukern) uses different placeholder names, update the
// object below to match them.
export async function sendTeamCredentialsEmail(params: TeamCredentialsEmail): Promise<void> {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    throw new Error('EmailJS is not configured — check VITE_EMAILJS_* in admin_panel/.env.');
  }

  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      to_email: params.to_email,
      email: params.to_email,
      team_name: params.team_name,
      leader_name: params.leader_name,
      team_code: params.team_code,
      password: params.password,
      app_name: 'SwachhLens',
    },
    { publicKey: PUBLIC_KEY }
  );
}
