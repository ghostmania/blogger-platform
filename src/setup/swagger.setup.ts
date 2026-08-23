import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GLOBAL_PREFIX } from './global-prefix.setup';

export function swaggerSetup(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('BLOGGER API')
    .addBearerAuth()
    //имя схемы должно совпадать с аргументом @ApiBasicAuth('basicAuth') в контроллерах,
    //иначе Swagger UI не покажет замок и не даст ввести логин суперадмина
    .addBasicAuth({ type: 'http', scheme: 'basic' }, 'basicAuth')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(GLOBAL_PREFIX, app, document, {
    customSiteTitle: 'Blogger Swagger',
  });
}
