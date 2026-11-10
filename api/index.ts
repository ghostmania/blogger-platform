//.env читается до импорта AppModule: фабрика TypeORM берёт DATABASE_URL
//при создании подключения
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { appSetup } from '../src/setup/app.setup';
import type { IncomingMessage, ServerResponse } from 'http';

// Serverless-адаптер для Vercel.
// На проде НЕ используем app.listen() — Vercel вызывает экспортированный handler.
// Инстанс Nest кешируется между вызовами в рамках тёплого контейнера,
// чтобы не поднимать приложение (и коннект к PostgreSQL) на каждый запрос.
let cachedServer: Promise<
  (req: IncomingMessage, res: ServerResponse) => void
> | null = null;

async function bootstrapServer() {
  const app = await NestFactory.create(AppModule);

  appSetup(app); //глобальные настройки (pipes, global prefix 'api', swagger)

  await app.init(); //init вместо listen — HTTP-сервер поднимать не нужно

  //дефолтный адаптер — express; возвращаем его инстанс как request-handler
  return app.getHttpAdapter().getInstance();
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (!cachedServer) {
    //упавший bootstrap не должен залипать в кеше: иначе каждый следующий
    //запрос этого контейнера падал бы с той же ошибкой без попытки подняться
    cachedServer = bootstrapServer().catch((error: unknown) => {
      cachedServer = null;
      throw error;
    });
  }

  const server = await cachedServer;

  return server(req, res);
}
