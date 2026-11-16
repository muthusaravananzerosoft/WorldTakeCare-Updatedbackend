import type { MailMessage, MailSender } from './mail-sender.interface.js';

/**
 * Development MailSender — prints outgoing mail to the server console instead
 * of sending it. Used until real SMTP/transactional credentials are provided;
 * swapping providers only changes the implementation created in index.ts.
 */
export class ConsoleMailSender implements MailSender {
  async send(message: MailMessage): Promise<void> {
    console.info(
      `[mail:dev] to=${message.to} subject="${message.subject}"` +
        (message.text ? `\n${message.text}` : ''),
    );
  }
}
