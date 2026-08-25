import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UsersTestManager } from './helpers/users-test-manager';
import { initSettings } from './helpers/init-settings';
import { deleteAllData } from './helpers/delete-all-data';
import { refreshTokenCookie } from './helpers/cookies';
import { delay } from './helpers/delay';
import { CreateUserDto } from '../src/modules/user-accounts/dto/create-user.dto';

const userInput: CreateUserDto = {
  login: 'devuser',
  password: 'password123',
  email: 'devuser@example.com',
};

const otherUserInput: CreateUserDto = {
  login: 'otheruser',
  password: 'password123',
  email: 'otheruser@example.com',
};

describe('security devices (multi-device flow)', () => {
  let app: INestApplication;
  let userTestManger: UsersTestManager;

  beforeAll(async () => {
    const result = await initSettings('nest-bloggers-platform-test-devices');
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

  describe('GET /security/devices', () => {
    it('should return a session per each login', async () => {
      const sessions = await userTestManger.loginFromSeveralDevices(
        userInput.login,
        userInput.password,
        4,
      );

      const devices = await userTestManger.getDevices(sessions[0].refreshToken);

      expect(devices).toHaveLength(4);
      expect(devices[0]).toEqual({
        ip: expect.any(String),
        title: expect.any(String),
        lastActiveDate: expect.any(String),
        deviceId: expect.any(String),
      });

      //deviceId у каждой сессии свой
      const deviceIds = devices.map((device) => device.deviceId);
      expect(new Set(deviceIds).size).toBe(4);

      //title берётся из User-Agent запроса на логин
      expect(devices.map((device) => device.title).sort()).toEqual([
        'device-0',
        'device-1',
        'device-2',
        'device-3',
      ]);
    });

    it('should return 401 without refresh token cookie', async () => {
      await request(app.getHttpServer())
        .get(`/security/devices`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 for invalid refresh token', async () => {
      await request(app.getHttpServer())
        .get(`/security/devices`)
        .set('Cookie', refreshTokenCookie('not-a-jwt'))
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should not return sessions of another user', async () => {
      await userTestManger.createUser(otherUserInput);

      const { refreshToken } = await userTestManger.loginWithTokens(
        userInput.login,
        userInput.password,
      );
      await userTestManger.loginWithTokens(
        otherUserInput.login,
        otherUserInput.password,
      );

      const devices = await userTestManger.getDevices(refreshToken);

      expect(devices).toHaveLength(1);
    });
  });

  describe('DELETE /security/devices', () => {
    it('should terminate all sessions except the current one', async () => {
      const sessions = await userTestManger.loginFromSeveralDevices(
        userInput.login,
        userInput.password,
        3,
      );
      const current = sessions[0];

      await request(app.getHttpServer())
        .delete(`/security/devices`)
        .set('Cookie', refreshTokenCookie(current.refreshToken))
        .expect(HttpStatus.NO_CONTENT);

      const devices = await userTestManger.getDevices(current.refreshToken);
      expect(devices).toHaveLength(1);

      //токены отключённых устройств больше не работают
      await userTestManger.getDevices(
        sessions[1].refreshToken,
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('should return 401 without refresh token cookie', async () => {
      await request(app.getHttpServer())
        .delete(`/security/devices`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('DELETE /security/devices/:deviceId', () => {
    it('should terminate the specified session', async () => {
      const sessions = await userTestManger.loginFromSeveralDevices(
        userInput.login,
        userInput.password,
        2,
      );
      const devices = await userTestManger.getDevices(sessions[0].refreshToken);
      const victim = devices.find((device) => device.title === 'device-1')!;

      await request(app.getHttpServer())
        .delete(`/security/devices/${victim.deviceId}`)
        .set('Cookie', refreshTokenCookie(sessions[0].refreshToken))
        .expect(HttpStatus.NO_CONTENT);

      const rest = await userTestManger.getDevices(sessions[0].refreshToken);
      expect(rest).toHaveLength(1);
      expect(rest[0].title).toBe('device-0');
    });

    it('should return 404 for unknown deviceId', async () => {
      const { refreshToken } = await userTestManger.loginWithTokens(
        userInput.login,
        userInput.password,
      );

      await request(app.getHttpServer())
        .delete(`/security/devices/2e2e0000-0000-4000-8000-000000000000`)
        .set('Cookie', refreshTokenCookie(refreshToken))
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 403 when terminating a session of another user', async () => {
      await userTestManger.createUser(otherUserInput);

      const owner = await userTestManger.loginWithTokens(
        userInput.login,
        userInput.password,
      );
      const stranger = await userTestManger.loginWithTokens(
        otherUserInput.login,
        otherUserInput.password,
      );

      const ownerDevices = await userTestManger.getDevices(owner.refreshToken);

      await request(app.getHttpServer())
        .delete(`/security/devices/${ownerDevices[0].deviceId}`)
        .set('Cookie', refreshTokenCookie(stranger.refreshToken))
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 401 without refresh token cookie', async () => {
      await request(app.getHttpServer())
        .delete(`/security/devices/some-device-id`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('lastActiveDate', () => {
    it('should be overridden by the issued date of the new refresh token', async () => {
      const { refreshToken } = await userTestManger.loginWithTokens(
        userInput.login,
        userInput.password,
      );
      const [before] = await userTestManger.getDevices(refreshToken);

      await delay(1100);
      const refreshed = await userTestManger.refreshTokens(refreshToken);

      const [after] = await userTestManger.getDevices(refreshed.refreshToken);

      //deviceId переживает рефреш, а дата последней активности обновляется
      expect(after.deviceId).toBe(before.deviceId);
      expect(new Date(after.lastActiveDate).getTime()).toBeGreaterThan(
        new Date(before.lastActiveDate).getTime(),
      );
    });
  });
});
