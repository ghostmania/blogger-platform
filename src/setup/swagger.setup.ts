import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GLOBAL_PREFIX } from './global-prefix.setup';
import { REFRESH_TOKEN_COOKIE_NAME } from '../modules/user-accounts/constants/auth.constants';

export function swaggerSetup(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('BLOGGER API')
    .addBearerAuth()
    //имя схемы должно совпадать с аргументом @ApiBasicAuth('basicAuth') в контроллерах,
    //иначе Swagger UI не покажет замок и не даст ввести логин суперадмина
    .addBasicAuth({ type: 'http', scheme: 'basic' }, 'basicAuth')
    //refresh-token/logout и /security/devices авторизуются cookie, а не заголовком
    .addCookieAuth(REFRESH_TOKEN_COOKIE_NAME)
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(GLOBAL_PREFIX, app, document, {
    customSiteTitle: 'Blogger Swagger',
  });
}
