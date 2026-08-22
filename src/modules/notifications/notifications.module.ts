import { Logger, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';

//TODO: move to configService. will be in the following lessons
const SMTP_URL = process.env.SMTP_URL;
const SMTP_FROM =
  process.env.SMTP_FROM ?? '"Blogger Platform" <noreply@blogger-platform.com>';

//без таймаутов nodemailer висит на недоступном SMTP минутами: на serverless это
//вешает весь инстанс, поэтому неудачную отправку ограничиваем несколькими секундами
const CONNECTION_TIMEOUT_MS = 5000;
const GREETING_TIMEOUT_MS = 5000;
const SOCKET_TIMEOUT_MS = 10000;

//SMTP_URL вида smtps://user:pass@smtp.example.com
function buildTransport() {
  if (!SMTP_URL) {
    //НЕ подставляем несуществующий хост-заглушку: попытка достучаться до него
    //висит и ломает инстанс. jsonTransport ничего не отправляет и не открывает сокетов
    new Logger('NotificationsModule').warn(
      'SMTP_URL is not set — emails are not delivered (jsonTransport is used)',
    );

    return { jsonTransport: true };
  }

  const url = new URL(SMTP_URL);
  const isSecure = url.protocol === 'smtps:';

  return {
    host: url.hostname,
    port: Number(url.port) || (isSecure ? 465 : 587),
    secure: isSecure,
    auth: {
      user: decodeURIComponent(url.username),
      pass: decodeURIComponent(url.password),
    },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: GREETING_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
  };
}

@Module({
  imports: [
    MailerModule.forRoot({
      transport: buildTransport(),
      defaults: { from: SMTP_FROM },
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class NotificationsModule {}
