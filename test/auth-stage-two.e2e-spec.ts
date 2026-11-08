import { TypeOrmThrottlerStorage } from '../src/core/rate-limiting/typeorm-throttler-storage';
import { IpRestriction } from '../src/core/rate-limiting/ip-restriction.entity';
import { SecurityDevicesRepository } from '../src/modules/user-accounts/infrastructure/security-devices.repository.abstract';
import { DataSource } from 'typeorm';
import { DeviceSession } from '../src/modules/user-accounts/domain/device-session.entity';
import { refreshTokenCookie, extractRefreshToken } from './helpers/cookies';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { initSettings } from './helpers/init-settings';
import { deleteAllData } from './helpers/delete-all-data';

describe('Auth stage two and testing reset', () => {
  let app: INestApplication;
  beforeAll(async () => {
    ({ app } = await initSettings('auth-stage-two', undefined, true));
    await app.listen(0, '127.0.0.1');
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(async () => {
    await deleteAllData(app);
  });
  const attempt = (ip = '192.0.2.1') =>
    request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ loginOrEmail: 'missing', password: 'password123' });

  it('testing/all-data resets IP restrictions immediately and is repeatable', async () => {
    for (let i = 0; i < 5; i++) await attempt().expect(401);
    await attempt().expect(429);
    await request(app.getHttpServer()).delete('/testing/all-data').expect(204);
    await attempt().expect(401);
    await request(app.getHttpServer()).delete('/testing/all-data').expect(204);
    await attempt().expect(401);
  });
  it('isolates counters by IP and keeps the limit under concurrent requests', async () => {
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => attempt('192.0.2.2')),
    );
    expect(responses.filter((r) => r.status === 401)).toHaveLength(5);
    expect(responses.filter((r) => r.status === 429)).toHaveLength(3);
    await attempt('192.0.2.3').expect(401);
  });

  async function login() {
    await request(app.getHttpServer())
      .post('/sa/users')
      .auth('admin', 'qwerty')
      .send({
        login: 'session',
        email: 'session@example.com',
        password: 'password123',
      })
      .expect(201);
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('User-Agent', 'Stage Two Browser')
      .send({ loginOrEmail: 'session', password: 'password123' })
      .expect(200);
    return extractRefreshToken(response);
  }

  it('rotates a refresh token at most once under concurrent requests', async () => {
    const token = await login();
    const responses = await Promise.all(
      Array.from({ length: 2 }, () =>
        request(app.getHttpServer())
          .post('/auth/refresh-token')
          .set('Cookie', refreshTokenCookie(token)),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([200, 401]);
    const sessions = await app
      .get(DataSource)
      .getRepository(DeviceSession)
      .find();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].title).toBe('Stage Two Browser');
  });

  it('clears users, sessions and restrictions; old refresh tokens cannot restore them', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .get('/security/devices')
      .set('Cookie', refreshTokenCookie(token))
      .expect(200);
    await request(app.getHttpServer()).delete('/testing/all-data').expect(204);
    expect(await app.get(DataSource).getRepository(DeviceSession).count()).toBe(
      0,
    );
    await request(app.getHttpServer())
      .get('/security/devices')
      .set('Cookie', refreshTokenCookie(token))
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .set('Cookie', refreshTokenCookie(token))
      .expect(401);
    const users = await request(app.getHttpServer())
      .get('/sa/users')
      .auth('admin', 'qwerty')
      .expect(200);
    expect(users.body.totalCount).toBe(0);
  });

  it('rejects a refresh token after its user was deleted', async () => {
    const token = await login();
    const [session] = await app
      .get(DataSource)
      .getRepository(DeviceSession)
      .find();
    await request(app.getHttpServer())
      .delete(`/sa/users/${session.userId}`)
      .auth('admin', 'qwerty')
      .expect(204);
    await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .set('Cookie', refreshTokenCookie(token))
      .expect(401);
  });

  it('disables restrictions by default when no environment override exists', async () => {
    //дефолт этапа TypeORM blogs/posts: лимит выключен, пока не задан IP_RESTRICTION_ENABLED=true
    delete process.env.IP_RESTRICTION_ENABLED;
    for (let i = 0; i < 6; i++) await attempt().expect(401);
    process.env.IP_RESTRICTION_ENABLED = 'true';
  });

  it('shares rate counters between storage instances and removes them on reset', async () => {
    const source = app.get(DataSource);
    const first = new TypeOrmThrottlerStorage(source);
    const second = new TypeOrmThrottlerStorage(source);
    for (let i = 0; i < 5; i++) {
      expect(
        (await first.increment('shared-key', 10000, 5, 0, 'default')).isBlocked,
      ).toBe(false);
    }
    expect(
      (await second.increment('shared-key', 10000, 5, 0, 'default')).isBlocked,
    ).toBe(true);
    await request(app.getHttpServer()).delete('/testing/all-data').expect(204);
    expect(await source.getRepository(IpRestriction).count()).toBe(0);
    expect(
      (await second.increment('shared-key', 10000, 5, 0, 'default')).isBlocked,
    ).toBe(false);
  });

  it('does not resurrect a session terminated between token validation and rotation', async () => {
    await login();
    const source = app.get(DataSource);
    const [session] = await source.getRepository(DeviceSession).find();
    const previous = session.lastActiveDate;
    session.refresh(
      new Date(previous.getTime() + 1),
      session.expirationDate,
      session.ip,
    );
    const repository = app.get(SecurityDevicesRepository);
    await repository.deleteByDeviceId(session.deviceId);
    expect(await repository.rotate(session, previous)).toBe(false);
    expect(await source.getRepository(DeviceSession).count()).toBe(0);
  });

  it('hides expired sessions and rejects their refresh tokens', async () => {
    const token = await login();
    const repository = app.get(DataSource).getRepository(DeviceSession);
    const [session] = await repository.find();
    await repository.update(session.deviceId, {
      expirationDate: new Date(Date.now() - 1000),
    });
    await request(app.getHttpServer())
      .get('/security/devices')
      .set('Cookie', refreshTokenCookie(token))
      .expect(401);
  });
});
