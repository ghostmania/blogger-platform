import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { initSettings } from './helpers/init-settings';
import { EmailServiceMock } from './mock/email-service.mock';
import { deleteAllData } from './helpers/delete-all-data';
import { delay } from './helpers/delay';
import {
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
} from '../src/modules/user-accounts/constants/auth.constants';

//единственная спека, где ip-restriction включён (в остальных он мешал бы).
//счётчик throttler'а живёт в памяти процесса и не сбрасывается вместе с БД,
//поэтому каждый тест бьёт по СВОЕМУ эндпоинту — иначе они мешали бы друг другу
describe('ip-restriction (rate limit)', () => {
  let app: INestApplication;
  let emailServiceMock: EmailServiceMock;

  beforeAll(async () => {
    const result = await initSettings(
      'nest-bloggers-platform-test-rate-limit',
      undefined,
      true,
    );
    app = result.app;
    emailServiceMock = result.emailServiceMock;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await deleteAllData(app);
  });

  it(`should allow ${RATE_LIMIT_MAX} login attempts and reject the next one with 429`, async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post(`/auth/login`)
        .send({ loginOrEmail: 'nobody', password: 'wrongpassword' });

    for (let i = 0; i < RATE_LIMIT_MAX; ++i) {
      //неверные креды всё равно расходуют лимит: throttler стоит перед LocalAuthGuard
      await attempt().expect(HttpStatus.UNAUTHORIZED);
    }

    await attempt().expect(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('should count requests per endpoint, not globally', async () => {
    const recovery = () =>
      request(app.getHttpServer())
        .post(`/auth/password-recovery`)
        .send({ email: 'unknown@example.com' });

    for (let i = 0; i < RATE_LIMIT_MAX; ++i) {
      await recovery().expect(HttpStatus.NO_CONTENT);
    }
    await recovery().expect(HttpStatus.TOO_MANY_REQUESTS);

    //лимит /auth/password-recovery исчерпан, но у /auth/new-password свой счётчик
    const otherEndpoint = await request(app.getHttpServer())
      .post(`/auth/new-password`)
      .send({ newPassword: 'password123', recoveryCode: 'unknown-code' });

    expect(otherEndpoint.status).not.toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('should let requests through again after the window expires', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post(`/auth/registration-email-resending`)
        .send({ email: 'unknown@example.com' });

    for (let i = 0; i < RATE_LIMIT_MAX; ++i) {
      await attempt();
    }
    await attempt().expect(HttpStatus.TOO_MANY_REQUESTS);

    await delay(RATE_LIMIT_WINDOW_MS + 500);

    //после истечения окна счётчик обнуляется — 429 больше нет
    const response = await attempt();
    expect(response.status).not.toBe(HttpStatus.TOO_MANY_REQUESTS);
  }, 30_000);

  it('should not rate limit endpoints outside the auth flow', async () => {
    for (let i = 0; i < RATE_LIMIT_MAX + 3; ++i) {
      await request(app.getHttpServer()).get(`/blogs`).expect(HttpStatus.OK);
    }
  });
});

//регрессия: пока отправка письма ждалась внутри запроса, пять регистраций
//растягивались дольше 10-секундного окна, ранние попытки успевали выпасть
//из счётчика, и 429 не наступал никогда
describe('ip-restriction with slow email delivery', () => {
  let app: INestApplication;

  const SLOW_SMTP_MS = 2500;

  beforeAll(async () => {
    const result = await initSettings(
      'nest-bloggers-platform-test-rate-limit-slow',
      undefined,
      true,
    );
    app = result.app;

    //имитируем реальный SMTP: доставка занимает секунды
    jest
      .spyOn(result.emailServiceMock, 'sendConfirmationEmail')
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, SLOW_SMTP_MS)),
      );
  });

  afterAll(async () => {
    await app.close();
  });

  it('should still return 429 on the 6th registration', async () => {
    const attempt = (i: number) =>
      request(app.getHttpServer())
        .post(`/auth/registration`)
        .send({
          login: `slow${i}`,
          password: 'password123',
          email: `slow${i}@example.com`,
        });

    for (let i = 0; i < RATE_LIMIT_MAX; ++i) {
      await attempt(i).expect(HttpStatus.NO_CONTENT);
    }

    await attempt(RATE_LIMIT_MAX).expect(HttpStatus.TOO_MANY_REQUESTS);
  }, 30_000);
});
