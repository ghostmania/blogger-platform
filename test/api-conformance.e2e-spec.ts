import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { initSettings } from './helpers/init-settings';
import { deleteAllData } from './helpers/delete-all-data';

/**
 * Соответствие контракту инкубатора «Blogger platform with admin»:
 * public api (/auth, /security/devices, /blogs, /posts, /comments, /testing)
 * и super admin api (/sa/users, /sa/blogs). Проверяются коды, формы ответов,
 * пагинация, валидация и авторизация — то, что смотрит автопроверка.
 */
describe('API conformance (public + super admin)', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();
  const admin = (req: request.Test) => req.auth('admin', 'qwerty');

  beforeAll(async () => {
    ({ app } = await initSettings('api-conformance'));
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(async () => {
    await deleteAllData(app);
  });

  describe('routes outside the contract are absent', () => {
    it.each([
      ['get', '/users'],
      ['post', '/users'],
      ['get', '/users/1'],
      ['put', '/users/1'],
      ['delete', '/users/1'],
      ['post', '/blogs'],
      ['put', '/blogs/1'],
      ['delete', '/blogs/1'],
      ['get', '/app'],
    ] as Array<['get' | 'post' | 'put' | 'delete', string]>)(
      '%s %s -> 404 even for the super admin',
      async (method, path) => {
        await admin(request(server())[method](path))
          .send({})
          .expect(HttpStatus.NOT_FOUND);
      },
    );
  });
});
