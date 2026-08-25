import { Injectable } from '@nestjs/common';
import { EmailService } from '../../notifications/email.service';
import { runBackgroundTask } from '../../../core/utils/run-background-task';

/**
 * Тонкая обёртка над EmailService для сценариев user-accounts.
 *
 * Отправку НЕ ждём: ответ должен уходить сразу, иначе медленный SMTP растягивает
 * серию запросов дольше окна ip-restriction и лимит перестаёт срабатывать.
 * За доставку на serverless отвечает runBackgroundTask.
 */
@Injectable()
export class UserEmailNotifier {
  constructor(private emailService: EmailService) {}

  sendConfirmation(email: string, code: string): void {
    runBackgroundTask(
      () => this.emailService.sendConfirmationEmail(email, code),
      'Failed to send confirmation email',
    );
  }

  sendPasswordRecovery(email: string, code: string): void {
    runBackgroundTask(
      () => this.emailService.sendPasswordRecoveryEmail(email, code),
      'Failed to send password recovery email',
    );
  }
}
