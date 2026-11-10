import { pipesSetup } from './pipes.setup';
import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { Express } from 'express';
import { swaggerSetup } from './swagger.setup';

//exception filters регистрируются не здесь, а через APP_FILTER в AppModule
export function appSetup(app: INestApplication) {
  //refresh-токен ездит в cookie — без парсера req.cookies будет undefined
  app.use(cookieParser());
  //за прокси (Vercel/nginx) req.ip без этого равен адресу прокси,
  //и ip-restriction считал бы всех клиентов одним и тем же
  //HttpServer.getInstance() типизирован как any — сужаем до Express явно
  const express = app.getHttpAdapter().getInstance() as Express;
  express.set('trust proxy', true);
  pipesSetup(app);
  //БЕЗ глобального префикса: автотесты (и swagger-спека) ожидают роуты в корне: /blogs, /posts, /testing/all-data
  swaggerSetup(app);
}
