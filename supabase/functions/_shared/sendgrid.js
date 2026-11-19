export async function sendSendgridEmail({ to, subject, text, html }) {
  const apiKey = Deno.env.get('SENDGRID_API_KEY');
  const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL');
  const fromName = Deno.env.get('SENDGRID_FROM_NAME') || 'MediPoint';

  if (!apiKey || !fromEmail) {
    throw new Error('SendGrid is not configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL.');
  }

  const content = [];
  if (text) {
    content.push({ type: 'text/plain', value: text });
  }
  if (html) {
    content.push({ type: 'text/html', value: html });
  }
  if (!content.length) {
    throw new Error('SendGrid email needs text or html content.');
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: fromName },
      subject,
      content,
    }),
  });

  if (response.ok || response.status === 202) {
    return { ok: true };
  }

  const payload = await response.json().catch(() => ({}));
  const detail = payload.errors?.[0]?.message
    || payload.message
    || `SendGrid HTTP ${response.status}`;
  throw new Error(detail);
}
