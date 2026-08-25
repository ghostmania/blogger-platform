import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UsersTestManager } from './helpers/users-test-manager';
import { initSettings } from './helpers/init-settings';
import { deleteAllData } from './helpers/delete-all-data';
import { refreshTokenCookie } from './helpers/cookies';
import { delay } from './helpers/delay';

//проверяем именно то, на чём падали автотесты инкубатора:
//access должен протухнуть после паузы в 10 сек, refresh — после 20
describe('token expiration', () => {
  let app: INestApplication;
  let userTestManger: UsersTestManager;

  const userInput = {
    login: 'ttluser',
    password: 'password123',
    email: 'ttluser@example.com',
  };

  beforeAll(async () => {
    const result = await initSettings('nest-bloggers-platform-test-ttl');
    app = result.app;
    userTestManger = result.userTestManger;
    await deleteAllData(app);
    await userTestManger.createUser(userInput);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject an access token after a 10 sec delay', async () => {
    const { accessToken } = await userTestManger.loginWithTokens(
      userInput.login,
      userInput.password,
    );

    await userTestManger.me(accessToken);

    await delay(10_500);

    await request(app.getHttpServer())
      .get(`/auth/me`)
      .auth(accessToken, { type: 'bearer' })
      .expect(HttpStatus.UNAUTHORIZED);
  }, 40_000);

  it('should reject a refresh token after a 20 sec delay', async () => {
    const { refreshToken } = await userTestManger.loginWithTokens(
      userInput.login,
      userInput.password,
    );

    await delay(20_500);

    await request(app.getHttpServer())
      .post(`/auth/refresh-token`)
      .set('Cookie', refreshTokenCookie(refreshToken))
      .expect(HttpStatus.UNAUTHORIZED);
  }, 40_000);
});
