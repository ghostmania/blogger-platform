import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { appSetup } from '../src/setup/app.setup';
import type { IncomingMessage, ServerResponse } from 'http';

// Serverless-адаптер для Vercel.
// На проде НЕ используем app.listen() — Vercel вызывает экспортированный handler.
// Инстанс Nest кешируется между вызовами в рамках тёплого контейнера,
// чтобы не поднимать приложение (и коннект к Mongo) на каждый запрос.
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
    cachedServer = bootstrapServer();
  }

  const server = await cachedServer;

  return server(req, res);
}
