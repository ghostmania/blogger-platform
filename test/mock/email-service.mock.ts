import { EmailService } from '../../src/modules/notifications/email.service';

export class EmailServiceMock extends EmailService {
  //коды из "отправленных" писем — тесты достают их отсюда вместо реального ящика
  sentConfirmationCodes: { email: string; code: string }[] = [];
  sentRecoveryCodes: { email: string; code: string }[] = [];

  //override method
  async sendConfirmationEmail(email: string, code: string): Promise<void> {
    console.log('Call mock method sendConfirmationEmail / EmailServiceMock');
    this.sentConfirmationCodes.push({ email, code });

    return;
  }

  //override method
  async sendPasswordRecoveryEmail(email: string, code: string): Promise<void> {
    console.log(
      'Call mock method sendPasswordRecoveryEmail / EmailServiceMock',
    );
    this.sentRecoveryCodes.push({ email, code });

    return;
  }

  getLastConfirmationCode(): string {
    const last = this.sentConfirmationCodes.at(-1);
    if (!last) {
      throw new Error('No confirmation emails were sent');
    }
    return last.code;
  }

  getLastRecoveryCode(): string {
    const last = this.sentRecoveryCodes.at(-1);
    if (!last) {
      throw new Error('No recovery emails were sent');
    }
    return last.code;
  }

  clear() {
    this.sentConfirmationCodes = [];
    this.sentRecoveryCodes = [];
  }
}
