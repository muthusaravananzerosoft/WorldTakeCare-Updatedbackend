import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env.config.js';
import type { MailMessage, MailSender } from './mail-sender.interface.js';

/**
 * Real MailSender over SMTP (nodemailer). Selected automatically when
 * SMTP_HOST is configured — see index.ts. Credentials come only from env
 * vars, never from the legacy PHP source.
 */
export class SmtpMailSender implements MailSender {
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE, // true = 465 implicit TLS; false = STARTTLS (587)
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: env.SMTP_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo,
    });
  }
}
