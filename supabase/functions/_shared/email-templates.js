function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildPasswordResetEmail({ fullName, code }) {
  const safeName = escapeHtml(fullName || 'there');
  const safeCode = escapeHtml(code);
  const subject = 'MediPoint password reset verification';

  const text = [
    `Hello ${fullName || 'there'},`,
    '',
    'We received a request to reset the password for your MediPoint account.',
    '',
    `Your verification code is: ${code}`,
    '',
    'This code expires in 10 minutes. Enter it on the password reset screen to continue.',
    '',
    'If you did not request this change, you can ignore this email. Your password will stay the same.',
    '',
    'MediPoint Student Health Services',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f1ec;font-family:Arial,Helvetica,sans-serif;color:#16181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1ec;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e6e1d8;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#8f1116;padding:22px 28px;">
              <p style="margin:0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#ffe8e8;font-weight:700;">MediPoint</p>
              <p style="margin:6px 0 0;font-size:20px;line-height:1.3;color:#ffffff;font-weight:700;">Password reset verification</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.5;">Hello ${safeName},</p>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#3f3f46;">
                We received a request to reset the password for your MediPoint account.
                Use the verification code below to continue.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
                <tr>
                  <td align="center" style="background:#f8f4f0;border:1px solid #e6e1d8;border-radius:12px;padding:18px 16px;">
                    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#6b6f76;font-weight:700;">Verification code</p>
                    <p style="margin:0;font-size:32px;letter-spacing:0.28em;font-weight:700;color:#8f1116;font-family:Consolas,'Courier New',monospace;">${safeCode}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#3f3f46;">
                This code expires in <strong>10 minutes</strong>. Enter it on the MediPoint password reset screen, then choose a new password.
              </p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#6b6f76;">
                If you did not request this change, you can ignore this email. Your current password will remain unchanged.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px;border-top:1px solid #eee8e0;background:#faf8f5;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#6b6f76;">
                MediPoint Student Health Services<br>
                This message was sent automatically. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
