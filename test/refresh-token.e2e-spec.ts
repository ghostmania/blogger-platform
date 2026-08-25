import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UsersTestManager } from './helpers/users-test-manager';
import { initSettings } from './helpers/init-settings';
import { deleteAllData } from './helpers/delete-all-data';
import {
  getRefreshTokenCookieAttributes,
  refreshTokenCookie,
} from './helpers/cookies';
import { CreateUserDto } from '../src/modules/user-accounts/dto/create-user.dto';

const userInput: CreateUserDto = {
  login: 'refresher',
  password: 'password123',
  email: 'refresher@example.com',
};

describe('refresh token flow', () => {
  let app: INestApplication;
  let userTestManger: UsersTestManager;

  beforeAll(async () => {
    const result = await initSettings('nest-bloggers-platform-test-refresh');
    app = result.app;
    userTestManger = result.userTestManger;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await deleteAllData(app);
    await userTestManger.createUser(userInput);
  });

  describe('login', () => {
    it('should set httpOnly secure refreshToken cookie and keep it out of the body', async () => {
      const response = await request(app.getHttpServer())
        .post(`/auth/login`)
        .send({
          loginOrEmail: userInput.login,
          password: userInput.password,
        })
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({ accessToken: expect.any(String) });
      expect(response.body.refreshToken).toBeUndefined();

      const cookie = getRefreshTokenCookieAttributes(response);
      expect(cookie).toBeDefined();
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/Secure/i);
    });
  });

  describe('POST /auth/refresh-token', () => {
    it('should return a new pair of tokens', async () => {
      const initial = await userTestManger.loginWithTokens(
        userInput.login,
        userInput.password,
      );

      const refreshed = await userTestManger.refreshTokens(
        initial.refreshToken,
      );

      expect(refreshed.accessToken).toEqual(expect.any(String));
      expect(refreshed.refreshToken).toEqual(expect.any(String));
      expect(refreshed.refreshToken).not.toBe(initial.refreshToken);

      //новый access-токен рабочий
      const me = await userTestManger.me(refreshed.accessToken);
      expect(me.login).toBe(userInput.login);
    });

    it('should revoke the used refresh token', async () => {
      const initial = await userTestManger.loginWithTokens(
        userInput.login,
        userInput.password,
      );

      await userTestManger.refreshTokens(initial.refreshToken);

      //повторное использование того же токена запрещено
      await userTestManger.refreshTokens(
        initial.refreshToken,
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('should allow refreshing repeatedly with the newest token', async () => {
      let current = await userTestManger.loginWithTokens(
        userInput.login,
        userInput.password,
      );

      for (let i = 0; i < 3; ++i) {
        current = await userTestManger.refreshTokens(current.refreshToken);
      }

      const devices = await userTestManger.getDevices(current.refreshToken);
      //рефреш не плодит новые сессии
      expect(devices).toHaveLength(1);
    });

    it('should return 401 without cookie', async () => {
      await request(app.getHttpServer())
        .post(`/auth/refresh-token`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 for a malformed token', async () => {
      await request(app.getHttpServer())
        .post(`/auth/refresh-token`)
        .set('Cookie', refreshTokenCookie('garbage.token.value'))
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should not accept an access token in place of a refresh token', async () => {
      const { accessToken } = await userTestManger.loginWithTokens(
        userInput.login,
        userInput.password,
      );

      await request(app.getHttpServer())
        .post(`/auth/refresh-token`)
        .set('Cookie', refreshTokenCookie(accessToken))
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /auth/logout', () => {
    it('should revoke the refresh token and drop the session', async () => {
      const session = await userTestManger.loginWithTokens(
        userInput.login,
        userInput.password,
      );

      await userTestManger.logout(session.refreshToken);

      await userTestManger.refreshTokens(
        session.refreshToken,
        HttpStatus.UNAUTHORIZED,
      );
      await userTestManger.getDevices(
        session.refreshToken,
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('should not affect sessions of other devices', async () => {
      const [first, second] = await userTestManger.loginFromSeveralDevices(
        userInput.login,
        userInput.password,
        2,
      );

      await userTestManger.logout(first.refreshToken);

      const devices = await userTestManger.getDevices(second.refreshToken);
      expect(devices).toHaveLength(1);
      expect(devices[0].title).toBe('device-1');
    });

    it('should return 401 when logging out twice with the same token', async () => {
      const session = await userTestManger.loginWithTokens(
        userInput.login,
        userInput.password,
      );

      await userTestManger.logout(session.refreshToken);
      await userTestManger.logout(
        session.refreshToken,
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('should return 401 without cookie', async () => {
      await request(app.getHttpServer())
        .post(`/auth/logout`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
