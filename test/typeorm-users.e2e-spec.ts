import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { Pool } from 'pg';
import request from 'supertest';
import { initSettings } from './helpers/init-settings';
import { deleteAllData } from './helpers/delete-all-data';
import { PG_POOL } from '../src/core/database/database.constants';
import { User } from '../src/modules/user-accounts/domain/user.entity';

describe('TypeORM users assignment', () => {
  let app: INestApplication;
  const input = {
    login: 'alice',
    email: 'alice@example.com',
    password: 'password123',
  };
  const admin = (req: request.Test) => req.auth('admin', 'qwerty');
  beforeAll(async () => {
    ({ app } = await initSettings('typeorm-users'));
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(async () => {
    await deleteAllData(app);
  });

  it('supports admin CRUD, soft deletion, and reusing deleted credentials', async () => {
    await request(app.getHttpServer()).get('/sa/users').expect(401);
    const { body: created } = await admin(
      request(app.getHttpServer()).post('/sa/users'),
    )
      .send(input)
      .expect(201);
    expect(created).toEqual({
      id: expect.any(String),
      login: input.login,
      email: input.email,
      createdAt: expect.any(String),
    });
    const repository = app.get(DataSource).getRepository(User);
    expect(
      (await repository.findOneByOrFail({ id: created.id })).emailConfirmation
        .isConfirmed,
    ).toBe(true);
    const { body: duplicate } = await admin(
      request(app.getHttpServer()).post('/sa/users'),
    )
      .send(input)
      .expect(400);
    expect(duplicate.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'login' })]),
    );
    await admin(
      request(app.getHttpServer()).delete(`/sa/users/${created.id}`),
    ).expect(204);
    expect(await repository.findOneBy({ id: created.id })).toBeNull();
    expect(
      (
        await repository.findOneOrFail({
          where: { id: created.id },
          withDeleted: true,
        })
      ).deletedAt,
    ).toBeInstanceOf(Date);
    await admin(
      request(app.getHttpServer()).delete(`/sa/users/${created.id}`),
    ).expect(404);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ loginOrEmail: input.login, password: input.password })
      .expect(401);
    await admin(request(app.getHttpServer()).post('/sa/users'))
      .send(input)
      .expect(201);
  });

  it('keeps preexisting SQL rows and applies OR search, ordering and out-of-range pagination', async () => {
    const pool = app.get<Pool>(PG_POOL);
    await pool.query(
      `INSERT INTO users (id, login, email, password_hash) VALUES (9007199254740993, 'legacy', 'legacy@example.com', 'unused'), (42, 'Bob', 'second@example.com', 'unused')`,
    );
    const response = await admin(request(app.getHttpServer()).get('/sa/users'))
      .query({
        searchLoginTerm: 'LEG',
        searchEmailTerm: 'SECOND',
        sortBy: 'login',
        sortDirection: 'asc',
        pageSize: 1,
      })
      .expect(200);
    expect(response.body.totalCount).toBe(2);
    expect(response.body.items[0].login).toBe('Bob');
    const page2 = await admin(request(app.getHttpServer()).get('/sa/users'))
      .query({
        sortBy: 'login',
        sortDirection: 'asc',
        pageSize: 1,
        pageNumber: 2,
      })
      .expect(200);
    expect(page2.body.items[0].id).toBe('9007199254740993');
    const empty = await admin(request(app.getHttpServer()).get('/sa/users'))
      .query({ pageNumber: 99, pageSize: 1 })
      .expect(200);
    expect(empty.body).toMatchObject({
      items: [],
      totalCount: 2,
      pagesCount: 2,
    });
    expect(app.get(DataSource).options.synchronize).toBe(false);
  });

  it('registers and logs in without IP restriction; access token lasts at least 300 seconds', async () => {
    for (let n = 0; n < 7; n++) {
      await request(app.getHttpServer())
        .post('/auth/registration')
        .send({ ...input, login: `user${n}`, email: `user${n}@example.com` })
        .expect(204);
    }
    let accessToken = '';
    for (let n = 0; n < 7; n++) {
      const { body } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginOrEmail: 'user0@example.com', password: input.password })
        .expect(200);
      accessToken = body.accessToken;
    }
    const payload = new JwtService().decode(accessToken) as {
      exp: number;
      iat: number;
    };
    expect(payload.exp - payload.iat).toBeGreaterThanOrEqual(300);
    await request(app.getHttpServer())
      .get('/auth/me')
      .auth(accessToken, { type: 'bearer' })
      .expect(200);
  });

  it('returns a validation error when simultaneous creates race on a unique index', async () => {
    await app.listen(0, '127.0.0.1');
    const results = await Promise.all([
      admin(request(app.getHttpServer()).post('/sa/users')).send(input),
      admin(request(app.getHttpServer()).post('/sa/users')).send(input),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 400]);
    expect(
      results.find((result) => result.status === 400)?.body.errorsMessages,
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'login' })]),
    );
    expect(await app.get(DataSource).getRepository(User).count()).toBe(1);
  });

  it('rejects malformed IDs and codes without database errors', async () => {
    for (const id of ['invalid', '9223372036854775808'])
      await admin(
        request(app.getHttpServer()).delete(`/sa/users/${id}`),
      ).expect(404);
    await request(app.getHttpServer())
      .post('/auth/registration-confirmation')
      .send({ code: 'invalid' })
      .expect(400);
  });
});
