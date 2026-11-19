export async function sendMailgunEmail({ to, subject, text, html }) {
  const apiKey = Deno.env.get('MAILGUN_API_KEY');
  const domain = Deno.env.get('MAILGUN_DOMAIN');
  const baseUrl = String(Deno.env.get('MAILGUN_BASE_URL') || 'https://api.mailgun.net').replace(/\/$/, '');
  const from = Deno.env.get('MAILGUN_FROM')
    || `MediPoint <postmaster@${domain || 'localhost'}>`;

  if (!apiKey || !domain) {
    throw new Error('Mailgun is not configured. Set MAILGUN_API_KEY and MAILGUN_DOMAIN.');
  }

  const body = new FormData();
  body.append('from', from);
  body.append('to', to);
  body.append('subject', subject);
  body.append('text', text);
  if (html) body.append('html', html);

  const response = await fetch(`${baseUrl}/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
    },
    body,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.message || payload.error || `Mailgun HTTP ${response.status}`;
    throw new Error(detail);
  }

  return payload;
}
