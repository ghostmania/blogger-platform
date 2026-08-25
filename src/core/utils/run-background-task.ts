import { Logger } from '@nestjs/common';
import { waitUntil } from '@vercel/functions';

const logger = new Logger('BackgroundTask');

/**
 * Запускает работу «после ответа» (например, отправку письма), НЕ задерживая ответ.
 *
 * Зачем не просто await: SMTP отвечает секунды, а ip-restriction считает запросы
 * скользящим окном в 10 секунд. Если держать ответ до конца отправки, пять
 * последовательных регистраций растянутся дольше окна, ранние попытки успеют
 * «протухнуть», и шестая никогда не упрётся в 429.
 *
 * На Vercel приложение живёт как serverless-функция: после отправки ответа
 * инстанс замораживается, и неразрешённый промис просто теряется — письмо не уйдёт.
 * waitUntil просит платформу додержать функцию до завершения промиса, но ответ
 * при этом уходит сразу.
 *
 * Вне Vercel (локальный dev, тесты, обычный сервер) процесс никуда не девается,
 * поэтому достаточно fire-and-forget.
 *
 * Ошибки всегда логируются и никогда не роняют запрос: юзер создан, код сохранён,
 * письмо можно перезапросить через registration-email-resending.
 */
export function runBackgroundTask(
  task: () => Promise<unknown>,
  errorMessage: string,
): void {
  const guarded = Promise.resolve()
    .then(task)
    .catch((error: unknown) => {
      logger.error(errorMessage, error);
    });

  if (process.env.VERCEL) {
    waitUntil(guarded);
  }
}
