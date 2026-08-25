import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CreateUserInputDto } from '../../src/modules/user-accounts/api/input-dto/users.input-dto';
import {
  MeViewDto,
  UserViewDto,
} from '../../src/modules/user-accounts/api/view-dto/users.view-dto';
import { DeviceViewDto } from '../../src/modules/user-accounts/api/view-dto/devices.view-dto';
import { delay } from './delay';
import { extractRefreshToken, refreshTokenCookie } from './cookies';

export class UsersTestManager {
  constructor(private app: INestApplication) {}

  async createUser(
    createModel: CreateUserInputDto,
    statusCode: number = HttpStatus.CREATED,
  ): Promise<UserViewDto> {
    const response = await request(this.app.getHttpServer())
      .post(`/users`)
      .send(createModel)
      .auth('admin', 'qwerty')
      .expect(statusCode);

    return response.body;
  }

  async registerUser(
    createModel: CreateUserInputDto,
    statusCode: number = HttpStatus.NO_CONTENT,
  ): Promise<void> {
    await request(this.app.getHttpServer())
      .post(`/auth/registration`)
      .send(createModel)
      .expect(statusCode);
  }

  async login(
    loginOrEmail: string,
    password: string,
    statusCode: number = HttpStatus.OK,
  ): Promise<{ accessToken: string }> {
    const response = await request(this.app.getHttpServer())
      .post(`/auth/login`)
      .send({ loginOrEmail, password })
      .expect(statusCode);

    return {
      accessToken: response.body.accessToken,
    };
  }

  //логин, из которого нужны обе половины пары токенов (refresh лежит в cookie)
  async loginWithTokens(
    loginOrEmail: string,
    password: string,
    userAgent: string = 'jest-test-agent',
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await request(this.app.getHttpServer())
      .post(`/auth/login`)
      .set('User-Agent', userAgent)
      .send({ loginOrEmail, password })
      .expect(HttpStatus.OK);

    return {
      accessToken: response.body.accessToken,
      refreshToken: extractRefreshToken(response),
    };
  }

  async refreshTokens(
    refreshToken: string,
    statusCode: number = HttpStatus.OK,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await request(this.app.getHttpServer())
      .post(`/auth/refresh-token`)
      .set('Cookie', refreshTokenCookie(refreshToken))
      .expect(statusCode);

    if (statusCode !== HttpStatus.OK) {
      return { accessToken: '', refreshToken: '' };
    }

    return {
      accessToken: response.body.accessToken,
      refreshToken: extractRefreshToken(response),
    };
  }

  async logout(
    refreshToken: string,
    statusCode: number = HttpStatus.NO_CONTENT,
  ): Promise<void> {
    await request(this.app.getHttpServer())
      .post(`/auth/logout`)
      .set('Cookie', refreshTokenCookie(refreshToken))
      .expect(statusCode);
  }

  async getDevices(
    refreshToken: string,
    statusCode: number = HttpStatus.OK,
  ): Promise<DeviceViewDto[]> {
    const response = await request(this.app.getHttpServer())
      .get(`/security/devices`)
      .set('Cookie', refreshTokenCookie(refreshToken))
      .expect(statusCode);

    return response.body;
  }

  //регистрирует юзера через админскую ручку и логинит его нужное число раз,
  //каждый раз с новым User-Agent — так получаются разные device-сессии
  async loginFromSeveralDevices(
    loginOrEmail: string,
    password: string,
    count: number,
  ): Promise<{ accessToken: string; refreshToken: string }[]> {
    const sessions: { accessToken: string; refreshToken: string }[] = [];

    for (let i = 0; i < count; ++i) {
      sessions.push(
        await this.loginWithTokens(loginOrEmail, password, `device-${i}`),
      );
    }

    return sessions;
  }

  async me(
    accessToken: string,
    statusCode: number = HttpStatus.OK,
  ): Promise<MeViewDto> {
    const response = await request(this.app.getHttpServer())
      .get(`/auth/me`)
      .auth(accessToken, { type: 'bearer' })
      .expect(statusCode);

    return response.body;
  }

  async createSeveralUsers(count: number): Promise<UserViewDto[]> {
    const usersPromises = [] as Promise<UserViewDto>[];

    for (let i = 0; i < count; ++i) {
      await delay(50);
      const response = this.createUser({
        login: `test` + i,
        email: `test${i}@gmail.com`,
        password: '123456789',
      });
      usersPromises.push(response);
    }

    return Promise.all(usersPromises);
  }

  async createAndLoginSeveralUsers(
    count: number,
  ): Promise<{ accessToken: string }[]> {
    const users = await this.createSeveralUsers(count);

    const loginPromises = users.map((user: UserViewDto) =>
      this.login(user.login, '123456789'),
    );

    return await Promise.all(loginPromises);
  }
}
