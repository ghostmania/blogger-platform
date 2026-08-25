import { pipesSetup } from './pipes.setup';
import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { swaggerSetup } from './swagger.setup';

//exception filters регистрируются не здесь, а через APP_FILTER в AppModule
export function appSetup(app: INestApplication) {
  //refresh-токен ездит в cookie — без парсера req.cookies будет undefined
  app.use(cookieParser());
  //за прокси (Vercel/nginx) req.ip без этого равен адресу прокси,
  //и ip-restriction считал бы всех клиентов одним и тем же
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  pipesSetup(app);
  //БЕЗ глобального префикса: автотесты (и swagger-спека) ожидают роуты в корне: /blogs, /posts, /testing/all-data
  swaggerSetup(app);
}
