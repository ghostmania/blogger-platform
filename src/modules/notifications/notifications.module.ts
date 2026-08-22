import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';

@Module({
  imports: [
    MailerModule.forRoot({
      //TODO: move to configService. will be in the following lessons
      //реальный SMTP задаётся через env (напр. smtps://user:pass@smtp.gmail.com),
      //без него используется заглушка — отправка упадёт и залогируется в UsersService
      transport:
        process.env.SMTP_URL ?? 'smtps://user@domain.com:pass@smtp.domain.com',
      defaults: {
        from:
          process.env.SMTP_FROM ??
          '"Blogger Platform" <noreply@blogger-platform.com>',
      },
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class NotificationsModule {}
