import { pipesSetup } from './pipes.setup';
import { INestApplication } from '@nestjs/common';
import { swaggerSetup } from './swagger.setup';

export function appSetup(app: INestApplication) {
  pipesSetup(app);
  //БЕЗ глобального префикса: автотесты (и swagger-спека) ожидают роуты в корне: /blogs, /posts, /testing/all-data
  swaggerSetup(app);
}
