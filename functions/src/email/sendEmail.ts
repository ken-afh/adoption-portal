/**
 * sendEmail helper — wraps Nodemailer for outbound transactional email.
 * In emulator mode (FUNCTIONS_EMULATOR=true) emails are logged to console only.
 */

import * as nodemailer from 'nodemailer';
import { smtpConfig, EMAIL_FROM } from '../config';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    console.log('[sendEmail] EMULATOR — would send email:', {
      to: payload.to,
      subject: payload.subject,
      preview: payload.html.slice(0, 200),
    });
    return;
  }

  const transport = nodemailer.createTransport(smtpConfig());
  await transport.sendMail({
    from: EMAIL_FROM.value(),
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
}
