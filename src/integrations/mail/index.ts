import { env } from '../../config/env.config.js';
import { ConsoleMailSender } from './console-mail-sender.js';
import { SmtpMailSender } from './smtp-mail-sender.js';
import type { MailSender } from './mail-sender.interface.js';

/**
 * The app's single MailSender.
 * - SMTP_HOST set → real mail via SmtpMailSender (nodemailer)
 * - SMTP_HOST unset → ConsoleMailSender prints mail to the server log (dev)
 * Swapping providers later only changes this file.
 */
export const mailSender: MailSender = env.SMTP_HOST
  ? new SmtpMailSender()
  : new ConsoleMailSender();

export type { MailMessage, MailSender } from './mail-sender.interface.js';
