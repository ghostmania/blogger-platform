import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { initSettings } from './helpers/init-settings';
import { deleteAllData } from './helpers/delete-all-data';
import { Comment } from '../src/modules/bloggers-platform/comments/domain/comment.entity';

//Валидный по формату, но заведомо несуществующий id — должен давать 404, а не 500
const MISSING_ID = '9223372036854775807';
//За пределами int8 и нечисловой — Postgres без предварительной проверки ответил бы 22003/22P02
const INVALID_IDS = ['bad-id', '9223372036854775808'];
const content = 'A persisted comment with enough characters';
const password = 'password123';

type Method = 'get' | 'post' | 'put' | 'delete';

describe('TypeORM comments and reactions (public API)', () => {
  let app: INestApplication;
  let tokens: string[];
  let users: { id: string; login: string }[];
  let posts: string[];
  const server = () => app.getHttpServer();
  const admin = (req: request.Test) => req.auth('admin', 'qwerty');
  const auth = (req: request.Test, index = 0) =>
    req.auth(tokens[index], { type: 'bearer' });
  const createComment = async (postId = posts[0], index = 0) =>
    (
      await auth(request(server()).post(`/posts/${postId}/comments`), index)
        .send({ content })
        .expect(201)
    ).body;
  const reaction = (target: string, status: string, index = 0) =>
    auth(request(server()).put(`${target}/like-status`), index)
      .send({ likeStatus: status })
      .expect(204);
  const read = async (target: string, index?: number) => {
    const req = request(server()).get(target);
    return (await (index === undefined ? req : auth(req, index)).expect(200))
      .body;
  };
  const count = async (table: string) =>
    Number(
      (await app.get(DataSource).query(`SELECT count(*) FROM ${table}`))[0]
        .count,
    );

  beforeAll(async () => {
    ({ app } = await initSettings('typeorm-comments-likes'));
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(async () => {
    await deleteAllData(app);
    users = [];
    tokens = [];
    for (const n of [1, 2, 3, 4]) {
      const login = `user${n}`;
      const { body } = await admin(request(server()).post('/sa/users'))
        .send({ login, email: `${login}@example.com`, password })
        .expect(201);
      users.push({ id: body.id, login });
      const { body: session } = await request(server())
        .post('/auth/login')
        .send({ loginOrEmail: login, password })
        .expect(200);
      tokens.push(session.accessToken);
    }
    const { body: blog } = await admin(request(server()).post('/sa/blogs'))
      .send({
        name: 'Blog',
        description: 'Description',
        websiteUrl: 'https://example.com',
      })
      .expect(201);
    posts = [];
    for (const n of [1, 2]) {
      const { body: post } = await admin(
        request(server()).post(`/sa/blogs/${blog.id}/posts`),
      )
        .send({
          title: `Post ${n}`,
          shortDescription: 'Short',
          content: 'Body',
        })
        .expect(201);
      posts.push(post.id);
    }
  });

  describe('comments', () => {
    it('maps the Comment entity onto the existing comments table with synchronize off', () => {
      const dataSource = app.get(DataSource);
      expect(dataSource.options.synchronize).toBe(false);
      expect(dataSource.getMetadata(Comment).tableName).toBe('comments');
    });

    it('creates a trimmed comment for the authenticated author, ignoring forged author fields', async () => {
      const { body } = await auth(
        request(server()).post(`/posts/${posts[0]}/comments`),
      )
        .send({ content: `  ${content}  `, userId: '99', userLogin: 'forged' })
        .expect(201);
      expect(body).toEqual({
        id: expect.any(String),
        content,
        commentatorInfo: { userId: users[0].id, userLogin: users[0].login },
        createdAt: expect.any(String),
        likesInfo: { likesCount: 0, dislikesCount: 0, myStatus: 'None' },
      });
      expect(await read(`/comments/${body.id}`)).toEqual(body);
    });

    it('persists, reads, updates and deletes an owned comment together with its reactions', async () => {
      const comment = await createComment();
      const updated = 'An updated comment with enough characters';
      await auth(request(server()).put(`/comments/${comment.id}`))
        .send({ content: ` ${updated} ` })
        .expect(204);
      expect((await read(`/comments/${comment.id}`)).content).toBe(updated);
      await reaction(`/comments/${comment.id}`, 'Like', 1);
      expect((await read(`/comments/${comment.id}`)).likesInfo).toEqual({
        likesCount: 1,
        dislikesCount: 0,
        myStatus: 'None',
      });
      await auth(request(server()).delete(`/comments/${comment.id}`)).expect(
        204,
      );
      await request(server()).get(`/comments/${comment.id}`).expect(404);
      await auth(request(server()).delete(`/comments/${comment.id}`)).expect(
        404,
      );
      expect(await count('comment_likes')).toBe(0);
    });

    it('rejects editing and deleting another author’s comment with 403', async () => {
      const { id } = await createComment();
      await auth(request(server()).put(`/comments/${id}`), 1)
        .send({ content })
        .expect(403);
      await auth(request(server()).delete(`/comments/${id}`), 1).expect(403);
      expect((await read(`/comments/${id}`)).content).toBe(content);
    });

    it('paginates only the requested post, preserving totals on empty pages', async () => {
      const first = await createComment();
      const second = await createComment();
      await createComment(posts[1]);
      await reaction(`/comments/${second.id}`, 'Dislike');
      const page = await read(`/posts/${posts[0]}/comments?pageSize=1`, 0);
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
        `/posts/${posts[0]}/comments?pageSize=1&sortDirection=asc`,
      );
      expect(ascending.items[0]).toEqual({
        ...first,
        likesInfo: { likesCount: 0, dislikesCount: 0, myStatus: 'None' },
      });
      expect(
        await read(`/posts/${posts[0]}/comments?pageSize=1&pageNumber=3`),
      ).toEqual({
        totalCount: 2,
        pagesCount: 2,
        page: 3,
        pageSize: 1,
        items: [],
      });
      await request(server())
        .get(`/posts/${posts[0]}/comments?sortBy=invalid`)
        .expect(400);
      await request(server()).get(`/posts/${MISSING_ID}/comments`).expect(404);
    });

    it.each([MISSING_ID, ...INVALID_IDS])(
      'returns 404 when commenting on absent or invalid post %s',
      async (postId) => {
        await auth(request(server()).post(`/posts/${postId}/comments`))
          .send({ content })
          .expect(404);
      },
    );

    it('reads legacy rows with ids beyond Number.MAX_SAFE_INTEGER', async () => {
      await app
        .get(DataSource)
        .query(
          `INSERT INTO comments (id, content, post_id, user_id, user_login) VALUES (9007199254740993, $1, $2, $3, $4)`,
          [content, posts[0], users[1].id, users[1].login],
        );
      await app
        .get(DataSource)
        .query(
          `INSERT INTO comment_likes (comment_id, user_id, status) VALUES (9007199254740993, $1, 'Like')`,
          [users[0].id],
        );
      expect(await read('/comments/9007199254740993', 0)).toEqual({
        id: '9007199254740993',
        content,
        commentatorInfo: { userId: users[1].id, userLogin: users[1].login },
        createdAt: expect.any(String),
        likesInfo: { likesCount: 1, dislikesCount: 0, myStatus: 'Like' },
      });
    });
  });

  describe('reactions', () => {
    const reactionScenario = async (kind: 'posts' | 'comments') => {
      const id = kind === 'comments' ? (await createComment()).id : posts[0];
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
      //реакция None хранится как строка: на пару «цель – пользователь» одна запись
      expect(
        await count(kind === 'posts' ? 'post_likes' : 'comment_likes'),
      ).toBe(2);
    };

    it('handles concurrent and changing reactions for comments', () =>
      reactionScenario('comments'));

    //view поста отдаёт заглушки до миграции реакций постов на TypeORM (тикет 04)
    it.skip('handles concurrent and changing reactions for posts', () =>
      reactionScenario('posts'));

    it.skip('returns the newest three likes, keeps repeated likes stable, and updates list views', async () => {
      const target = `/posts/${posts[0]}`;
      for (let i = 0; i < 4; i++) await reaction(target, 'Like', i);
      let post = await read(target, 0);
      expect(post.extendedLikesInfo.likesCount).toBe(4);
      expect(
        post.extendedLikesInfo.newestLikes.map((like) => like.userId),
      ).toEqual([users[3].id, users[2].id, users[1].id]);
      expect(post.extendedLikesInfo.newestLikes[0]).toEqual({
        addedAt: expect.any(String),
        userId: users[3].id,
        login: users[3].login,
      });
      //повторный лайк не считается новой реакцией и не двигает её в «последних лайках»
      await reaction(target, 'Like');
      expect(
        (await read(target, 0)).extendedLikesInfo.newestLikes.map(
          (like) => like.userId,
        ),
      ).toEqual([users[3].id, users[2].id, users[1].id]);
      //смена статуса — новая реакция: лайк первого пользователя становится самым свежим
      await reaction(target, 'Dislike');
      await reaction(target, 'Like');
      post = await read(target, 0);
      expect(
        post.extendedLikesInfo.newestLikes.map((like) => like.userId),
      ).toEqual([users[0].id, users[3].id, users[2].id]);
      const blogId = post.blogId;
      for (const route of ['/posts', `/blogs/${blogId}/posts`]) {
        const page = await read(route, 0);
        expect(
          page.items.find((item) => item.id === posts[0]).extendedLikesInfo,
        ).toEqual(post.extendedLikesInfo);
      }
      expect(await read('/posts?pageNumber=99')).toMatchObject({
        totalCount: 2,
        items: [],
      });
    });
  });

  describe('errors and access', () => {
    it.each([MISSING_ID, ...INVALID_IDS])(
      'returns 404 for missing/invalid id %s',
      async (id) => {
        await request(server()).get(`/comments/${id}`).expect(404);
        await request(server()).get(`/posts/${id}/comments`).expect(404);
        await auth(request(server()).put(`/comments/${id}`))
          .send({ content })
          .expect(404);
        await auth(request(server()).delete(`/comments/${id}`)).expect(404);
        for (const kind of ['posts', 'comments']) {
          await auth(request(server()).put(`/${kind}/${id}/like-status`))
            .send({ likeStatus: 'Like' })
            .expect(404);
        }
      },
    );

    it('requires a valid bearer token for all writes', async () => {
      const { id } = await createComment();
      const routes: Array<[Method, string, object]> = [
        ['post', `/posts/${posts[0]}/comments`, { content }],
        ['put', `/comments/${id}`, { content }],
        ['delete', `/comments/${id}`, {}],
        ['put', `/posts/${posts[0]}/like-status`, { likeStatus: 'Like' }],
        ['put', `/comments/${id}/like-status`, { likeStatus: 'Like' }],
      ];
      for (const [method, path, body] of routes) {
        await request(server())[method](path).send(body).expect(401);
        await request(server())
          [method](path)
          .auth('invalid-token', { type: 'bearer' })
          .send(body)
          .expect(401);
      }
      expect(await read(`/posts/${posts[0]}/comments`)).toMatchObject({
        totalCount: 1,
      });
    });

    it('validates comment content and reaction status in the errorsMessages format', async () => {
      const { id } = await createComment();
      for (const invalid of [
        undefined,
        null,
        123,
        '',
        ' '.repeat(25),
        'x'.repeat(19),
        'x'.repeat(301),
      ]) {
        //запросы создаём по одному: supertest поднимает слушатель на каждый Test
        for (const [method, path] of [
          ['post', `/posts/${posts[0]}/comments`],
          ['put', `/comments/${id}`],
        ] as Array<[Method, string]>) {
          const { body } = await auth(request(server())[method](path))
            .send({ content: invalid })
            .expect(400);
          expect(body.errorsMessages).toEqual([
            { field: 'content', message: expect.any(String) },
          ]);
        }
      }
      for (const target of [`/posts/${posts[0]}`, `/comments/${id}`]) {
        for (const invalid of [undefined, null, 'love', 'like', 1]) {
          const { body } = await auth(
            request(server()).put(`${target}/like-status`),
          )
            .send({ likeStatus: invalid })
            .expect(400);
          expect(body.errorsMessages[0].field).toBe('likeStatus');
        }
      }
      expect((await read(`/comments/${id}`)).content).toBe(content);
      expect(await read(`/posts/${posts[0]}/comments`)).toMatchObject({
        totalCount: 1,
      });
    });

    it('clears comments and reactions through testing/all-data', async () => {
      const { id } = await createComment();
      await reaction(`/comments/${id}`, 'Like', 1);
      await deleteAllData(app);
      expect(await count('comments')).toBe(0);
      expect(await count('comment_likes')).toBe(0);
      await request(server()).get(`/comments/${id}`).expect(404);
    });
  });
});
