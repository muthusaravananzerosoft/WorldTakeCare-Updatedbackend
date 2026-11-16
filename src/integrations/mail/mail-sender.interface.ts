/**
 * Outbound email. Replaces legacy PHPMailer SMTP usage: welcome, activation
 * link, password-reset code, "X liked your profile", contact form, birthday
 * wishes and admin bulk mail. Credentials come from env (SMTP_* / provider API
 * key) — never from the legacy source.
 */
export interface MailMessage {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

export interface MailSender {
  send(message: MailMessage): Promise<void>;
}
