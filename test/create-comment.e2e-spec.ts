import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/modules/user-accounts/domain/user.entity';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { BloggersPlatformModule } from '../src/modules/bloggers-platform/bloggers-platform.module';
import { CoreModule } from '../src/core/core.module';
import { DatabaseModule } from '../src/core/database/database.module';
import { PG_POOL } from '../src/core/database/database.constants';
import { UsersExternalQueryRepository } from '../src/modules/user-accounts/infrastructure/external-query/users.external-query-repository';
import { ACCESS_TOKEN_SECRET } from '../src/modules/user-accounts/constants/auth.constants';
import { DomainHttpExceptionsFilter } from '../src/core/exceptions/filters/domain-exceptions.filter';
import { pipesSetup } from '../src/setup/pipes.setup';

// Exercise the real module, JWT guard, validation, CQRS handlers and SQL
// repositories; database boundaries and user lookup are substituted.
describe('Create comment HTTP flow', () => {
  let app: INestApplication;
  let token: string;
  const pool = { query: jest.fn(), end: jest.fn() };
  const users = { getByIdOrNotFoundFail: jest.fn() };
  const content = 'A comment long enough to be valid';
  const createdAt = new Date('2026-01-01T00:00:00.000Z');

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [DatabaseModule, CoreModule, BloggersPlatformModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(getRepositoryToken(User))
      .useValue({})
      .overrideProvider(PG_POOL)
      .useValue(pool)
      .overrideProvider(UsersExternalQueryRepository)
      .useValue(users)
      .compile();
    app = module.createNestApplication();
    pipesSetup(app);
    app.useGlobalFilters(new DomainHttpExceptionsFilter());
    await app.init();
    token = new JwtService().sign(
      { id: '7' },
      {
        secret: ACCESS_TOKEN_SECRET,
        expiresIn: '5m',
      },
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    users.getByIdOrNotFoundFail.mockResolvedValue({ id: '7', login: 'author' });
    pool.query.mockImplementation(async (sql: string, values: unknown[]) => {
      if (sql.includes('FROM posts')) {
        return { rows: values[0] === '1' ? [{ id: '1' }] : [] };
      }
      if (sql.includes('INSERT INTO comments')) return { rows: [{ id: '12' }] };
      if (sql.includes('FROM comments'))
        return {
          rows: [
            {
              id: '12',
              content: values[0] === '12' ? content : '',
              user_id: '7',
              user_login: 'author',
              created_at: createdAt,
              likes_count: '0',
              dislikes_count: '0',
              my_status: 'None',
            },
          ],
        };
      throw new Error(`Unexpected SQL: ${sql}`);
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('creates a trimmed comment using the authenticated author and returns 201', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/posts/1/comments')
      .auth(token, { type: 'bearer' })
      .send({ content: `  ${content}  `, userId: '99', userLogin: 'forged' })
      .expect(201);
    expect(body).toEqual({
      id: '12',
      content,
      commentatorInfo: { userId: '7', userLogin: 'author' },
      createdAt: createdAt.toISOString(),
      likesInfo: { likesCount: 0, dislikesCount: 0, myStatus: 'None' },
    });
    expect(users.getByIdOrNotFoundFail).toHaveBeenCalledWith('7');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO comments'),
      [content, '1', '7', 'author'],
    );
  });

  it.each([undefined, 'invalid-token'])(
    'rejects missing or invalid token (%s)',
    async (accessToken) => {
      const req = request(app.getHttpServer()).post('/posts/1/comments');
      if (accessToken) req.auth(accessToken, { type: 'bearer' });
      await req.send({ content }).expect(401);
      expect(pool.query).not.toHaveBeenCalled();
    },
  );

  it.each([
    undefined,
    null,
    123,
    '',
    ' '.repeat(30),
    'x'.repeat(19),
    'x'.repeat(301),
  ])('rejects invalid content (%s) before writing', async (invalidContent) => {
    const { body } = await request(app.getHttpServer())
      .post('/posts/1/comments')
      .auth(token, { type: 'bearer' })
      .send({ content: invalidContent })
      .expect(400);
    expect(body.errorsMessages).toEqual([
      { field: 'content', message: expect.any(String) },
    ]);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it.each(['2', 'not-an-id', '9223372036854775808'])(
    'returns 404 for absent or invalid post %s',
    async (postId) => {
      await request(app.getHttpServer())
        .post(`/posts/${postId}/comments`)
        .auth(token, { type: 'bearer' })
        .send({ content })
        .expect(404);
      expect(users.getByIdOrNotFoundFail).not.toHaveBeenCalled();
      expect(
        pool.query.mock.calls.some(([sql]) => sql.includes('INSERT')),
      ).toBe(false);
    },
  );
});
