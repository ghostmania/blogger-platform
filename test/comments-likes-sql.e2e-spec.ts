import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Pool } from 'pg';
import request from 'supertest';
import { BloggersPlatformModule } from '../src/modules/bloggers-platform/bloggers-platform.module';
import { CoreModule } from '../src/core/core.module';
import { DatabaseModule } from '../src/core/database/database.module';
import { PG_POOL } from '../src/core/database/database.constants';
import { applySchema } from '../src/core/database/apply-schema';
import { ACCESS_TOKEN_SECRET } from '../src/modules/user-accounts/constants/auth.constants';
import { DomainHttpExceptionsFilter } from '../src/core/exceptions/filters/domain-exceptions.filter';
import { pipesSetup } from '../src/setup/pipes.setup';

// Opt in with a dedicated PostgreSQL connection. Every run gets an isolated schema.
const describeSql = process.env.TEST_DATABASE_URL ? describe : describe.skip;
describeSql('Comments and likes with PostgreSQL', () => {
  let app: INestApplication;
  let pool: Pool;
  let admin: Pool;
  const schema = `comments_test_${process.pid}_${Date.now()}`;
  let tokens: string[];
  const content = 'A persisted comment with enough characters';
  const auth = (req: request.Test, index = 0) =>
    req.auth(tokens[index], { type: 'bearer' });
  const createComment = async (postId = '1', index = 0) =>
    (
      await auth(
        request(app.getHttpServer()).post(`/posts/${postId}/comments`),
        index,
      )
        .send({ content })
        .expect(201)
    ).body;
  const reaction = (target: string, status: string, index = 0) =>
    auth(request(app.getHttpServer()).put(`${target}/like-status`), index)
      .send({ likeStatus: status })
      .expect(204);
  const read = async (target: string, index?: number) => {
    const req = request(app.getHttpServer()).get(target);
    return (await (index === undefined ? req : auth(req, index)).expect(200))
      .body;
  };

  beforeAll(async () => {
    admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    await admin.query(`CREATE SCHEMA ${schema}`);
    pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL,
      options: `-c search_path=${schema}`,
    });
    await applySchema(pool);
    // Verify the additive schema script can be reapplied safely.
    await applySchema(pool);
    const module = await Test.createTestingModule({
      imports: [DatabaseModule, CoreModule, BloggersPlatformModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(getModelToken('User'))
      .useValue({})
      .overrideProvider(getModelToken('DeviceSession'))
      .useValue({})
      .overrideProvider(PG_POOL)
      .useValue(pool)
      .compile();
    app = module.createNestApplication();
    pipesSetup(app);
    app.useGlobalFilters(new DomainHttpExceptionsFilter());
    // Keep one listener open while concurrent Supertest requests are in flight.
    await app.listen(0, '127.0.0.1');
    const jwt = new JwtService();
    tokens = [1, 2, 3, 4].map((id) =>
      jwt.sign(
        { id: String(id) },
        {
          secret: ACCESS_TOKEN_SECRET,
          expiresIn: '10m',
        },
      ),
    );
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE users, blogs RESTART IDENTITY CASCADE');
    await pool.query(`INSERT INTO users (login, email, password_hash, is_confirmed)
      SELECT 'user' || n, 'user' || n || '@example.com', 'unused', true FROM generate_series(1, 4) n`);
    await pool.query(
      `INSERT INTO blogs (name, description, website_url) VALUES ('Blog', 'Description', 'https://example.com')`,
    );
    await pool.query(`INSERT INTO posts (title, short_description, content, blog_id, blog_name)
      SELECT 'Post ' || n, 'Short', 'Post body', 1, 'Blog' FROM generate_series(1, 2) n`);
  });

  afterAll(async () => {
    if (app) await app.close();
    else if (pool) await pool.end();
    if (admin) {
      await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await admin.end();
    }
  });

  it('persists, reads, updates and deletes an owned comment', async () => {
    const comment = await createComment();
    expect(await read(`/comments/${comment.id}`)).toEqual(comment);
    expect(comment.commentatorInfo).toEqual({
      userId: '1',
      userLogin: 'user1',
    });
    const updated = 'An updated comment with enough characters';
    await auth(request(app.getHttpServer()).put(`/comments/${comment.id}`))
      .send({ content: ` ${updated} ` })
      .expect(204);
    expect((await read(`/comments/${comment.id}`)).content).toBe(updated);
    await reaction(`/comments/${comment.id}`, 'Like', 1);
    await auth(
      request(app.getHttpServer()).delete(`/comments/${comment.id}`),
    ).expect(204);
    await request(app.getHttpServer())
      .get(`/comments/${comment.id}`)
      .expect(404);
    expect((await pool.query('SELECT * FROM comment_likes')).rows).toEqual([]);
  });

  it('rejects editing and deleting another author’s comment', async () => {
    const { id } = await createComment();
    await auth(request(app.getHttpServer()).put(`/comments/${id}`), 1)
      .send({ content })
      .expect(403);
    await auth(
      request(app.getHttpServer()).delete(`/comments/${id}`),
      1,
    ).expect(403);
    expect((await read(`/comments/${id}`)).content).toBe(content);
  });

  it('paginates only the requested post, preserving totals on empty pages', async () => {
    const first = await createComment();
    const second = await createComment();
    await createComment('2');
    await pool.query(
      "UPDATE comments SET created_at = '2026-01-01' WHERE id = $1",
      [first.id],
    );
    await pool.query(
      "UPDATE comments SET created_at = '2026-01-02' WHERE id = $1",
      [second.id],
    );
    await reaction(`/comments/${second.id}`, 'Dislike');
    const page = await read('/posts/1/comments?pageSize=1', 0);
    expect(page).toMatchObject({
      totalCount: 2,
      pagesCount: 2,
      page: 1,
      pageSize: 1,
    });
    expect(page.items.map((item) => item.id)).toEqual([second.id]);
    expect(page.items[0].likesInfo).toEqual({
      likesCount: 0,
      dislikesCount: 1,
      myStatus: 'Dislike',
    });
    const ascending = await read(
      '/posts/1/comments?pageSize=1&sortDirection=asc',
    );
    expect(ascending.items[0].id).toBe(first.id);
    expect(await read('/posts/1/comments?pageSize=1&pageNumber=3')).toEqual({
      totalCount: 2,
      pagesCount: 2,
      page: 3,
      pageSize: 1,
      items: [],
    });
    await request(app.getHttpServer())
      .get('/posts/1/comments?sortBy=invalid')
      .expect(400);
  });

  it.each(['posts', 'comments'])(
    'handles concurrent and changing reactions for %s',
    async (kind) => {
      const id = kind === 'comments' ? (await createComment()).id : '1';
      const target = `/${kind}/${id}`;
      const info = (body) =>
        kind === 'posts' ? body.extendedLikesInfo : body.likesInfo;
      await Promise.all(
        Array.from({ length: 8 }, () => reaction(target, 'Like')),
      );
      await reaction(target, 'Dislike', 1);
      expect(info(await read(target, 0))).toMatchObject({
        likesCount: 1,
        dislikesCount: 1,
        myStatus: 'Like',
      });
      expect(info(await read(target))).toMatchObject({
        likesCount: 1,
        dislikesCount: 1,
        myStatus: 'None',
      });
      await reaction(target, 'Dislike');
      expect(info(await read(target, 0))).toMatchObject({
        likesCount: 0,
        dislikesCount: 2,
        myStatus: 'Dislike',
      });
      await reaction(target, 'None');
      await reaction(target, 'None');
      expect(info(await read(target, 0))).toMatchObject({
        likesCount: 0,
        dislikesCount: 1,
        myStatus: 'None',
      });
      await reaction(target, 'Like');
      expect(info(await read(target, 0))).toMatchObject({
        likesCount: 1,
        dislikesCount: 1,
        myStatus: 'Like',
      });
      const table = kind === 'posts' ? 'post_likes' : 'comment_likes';
      expect((await pool.query(`SELECT * FROM ${table}`)).rows).toHaveLength(2);
    },
  );

  it('returns the newest three likes, keeps repeated likes stable, and updates list views', async () => {
    for (let i = 0; i < 4; i++) await reaction('/posts/1', 'Like', i);
    let post = await read('/posts/1', 0);
    expect(post.extendedLikesInfo.likesCount).toBe(4);
    expect(
      post.extendedLikesInfo.newestLikes.map((like) => like.userId),
    ).toEqual(['4', '3', '2']);
    expect(post.extendedLikesInfo.newestLikes[0]).toEqual({
      addedAt: expect.any(String),
      userId: '4',
      login: 'user4',
    });
    const before = (
      await pool.query('SELECT added_at FROM post_likes WHERE user_id = 1')
    ).rows[0].added_at;
    await reaction('/posts/1', 'Like');
    expect(
      (await pool.query('SELECT added_at FROM post_likes WHERE user_id = 1'))
        .rows[0].added_at,
    ).toEqual(before);
    await reaction('/posts/1', 'Dislike');
    await reaction('/posts/1', 'Like');
    post = await read('/posts/1', 0);
    expect(
      post.extendedLikesInfo.newestLikes.map((like) => like.userId),
    ).toEqual(['1', '4', '3']);
    for (const route of ['/posts', '/blogs/1/posts']) {
      const page = await read(route, 0);
      expect(
        page.items.find((item) => item.id === '1').extendedLikesInfo,
      ).toEqual(post.extendedLikesInfo);
    }
    expect(await read('/posts?pageNumber=99')).toMatchObject({
      totalCount: 2,
      items: [],
    });
  });

  it.each(['bad-id', '999', '9223372036854775808'])(
    'returns 404 for missing/invalid ID %s',
    async (id) => {
      const server = app.getHttpServer();
      await request(server).get(`/comments/${id}`).expect(404);
      await request(server).get(`/posts/${id}/comments`).expect(404);
      await auth(request(server).put(`/comments/${id}`))
        .send({ content })
        .expect(404);
      await auth(request(server).delete(`/comments/${id}`)).expect(404);
      for (const kind of ['posts', 'comments']) {
        await auth(request(server).put(`/${kind}/${id}/like-status`))
          .send({ likeStatus: 'Like' })
          .expect(404);
      }
    },
  );

  it('requires authentication for all writes and validates update content and reactions', async () => {
    const { id } = await createComment();
    const server = app.getHttpServer();
    await request(server).put(`/comments/${id}`).send({ content }).expect(401);
    await request(server).delete(`/comments/${id}`).expect(401);
    for (const invalid of [
      undefined,
      null,
      123,
      'short',
      ' '.repeat(25),
      'x'.repeat(301),
    ]) {
      const { body } = await auth(request(server).put(`/comments/${id}`))
        .send({ content: invalid })
        .expect(400);
      expect(body.errorsMessages[0].field).toBe('content');
    }
    for (const target of ['/posts/1', `/comments/${id}`]) {
      await request(server)
        .put(`${target}/like-status`)
        .send({ likeStatus: 'Like' })
        .expect(401);
      for (const invalid of [undefined, null, 'love', 'like', 1]) {
        const { body } = await auth(
          request(server).put(`${target}/like-status`),
        )
          .send({ likeStatus: invalid })
          .expect(400);
        expect(body.errorsMessages[0].field).toBe('likeStatus');
      }
    }
    expect((await read(`/comments/${id}`)).content).toBe(content);
  });
});
