import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../../notifications/email.service';

/**
 * Тонкая обёртка над EmailService для сценариев user-accounts.
 *
 * Отправку писем ОБЯЗАТЕЛЬНО ждём: на serverless (Vercel) контейнер замораживается
 * сразу после ответа, и «фоновый» промис отправки не доживает до конца — письмо не уходит,
 * а зависший SMTP-коннект оставляет инстанс нерабочим для следующих запросов.
 * Поэтому письма НЕ отправляются через EventBus (обработчики событий — fire-and-forget).
 * При этом сбой доставки не ломает сценарий: юзер создан, код сохранён, письмо можно перезапросить.
 */
@Injectable()
export class UserEmailNotifier {
  private readonly logger = new Logger(UserEmailNotifier.name);

  constructor(private emailService: EmailService) {}

  async sendConfirmation(email: string, code: string): Promise<void> {
    await this.trySend(
      () => this.emailService.sendConfirmationEmail(email, code),
      'Failed to send confirmation email',
    );
  }

  async sendPasswordRecovery(email: string, code: string): Promise<void> {
    await this.trySend(
      () => this.emailService.sendPasswordRecoveryEmail(email, code),
      'Failed to send password recovery email',
    );
  }

  private async trySend(
    send: () => Promise<void>,
    errorMessage: string,
  ): Promise<void> {
    try {
      await send();
    } catch (error: unknown) {
      this.logger.error(errorMessage, error);
    }
  }
}
