import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { initSettings } from './helpers/init-settings';
import { deleteAllData } from './helpers/delete-all-data';
import { EmailServiceMock } from './mock/email-service.mock';
import {
  extractRefreshToken,
  getRefreshTokenCookieAttributes,
  refreshTokenCookie,
} from './helpers/cookies';

/**
 * Соответствие контракту инкубатора «Blogger platform with admin»:
 * public api (/auth, /security/devices, /blogs, /posts, /comments, /testing)
 * и super admin api (/sa/users, /sa/blogs). Проверяются коды, формы ответов,
 * пагинация, валидация и авторизация — то, что смотрит автопроверка.
 *
 * Остальные спеки проверяют поведение подробно; здесь — чек-лист по каждому
 * эндпоинту, чтобы расхождение с контрактом было видно по имени теста.
 */

type Method = 'get' | 'post' | 'put' | 'delete';

//валидный по формату, но заведомо несуществующий id → 404
const MISSING_ID = '9223372036854775807';
//нечисловой и за пределами int8 → тоже 404, а не 500
const MALFORMED_IDS = ['not-an-id', '9223372036854775808'];
const MISSING_DEVICE_ID = '2e2e0000-0000-4000-8000-000000000000';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const password = 'password123';
const blogInput = {
  name: 'Tech blog',
  description: 'posts about backend',
  websiteUrl: 'https://example.com/tech',
};
const postInput = {
  title: 'First post',
  shortDescription: 'short description',
  content: 'post content',
};
const commentContent = 'A comment long enough to pass validation';

//формы ответов по swagger-спеке
const userShape = {
  id: expect.any(String),
  login: expect.any(String),
  email: expect.any(String),
  createdAt: expect.stringMatching(ISO_DATE),
};
const blogShape = {
  id: expect.any(String),
  name: expect.any(String),
  description: expect.any(String),
  websiteUrl: expect.any(String),
  createdAt: expect.stringMatching(ISO_DATE),
  isMembership: expect.any(Boolean),
};
const noPostReactions = {
  likesCount: 0,
  dislikesCount: 0,
  myStatus: 'None',
  newestLikes: [],
};
const postShape = {
  id: expect.any(String),
  title: expect.any(String),
  shortDescription: expect.any(String),
  content: expect.any(String),
  blogId: expect.any(String),
  blogName: expect.any(String),
  createdAt: expect.stringMatching(ISO_DATE),
  extendedLikesInfo: noPostReactions,
};
const commentShape = {
  id: expect.any(String),
  content: expect.any(String),
  commentatorInfo: {
    userId: expect.any(String),
    userLogin: expect.any(String),
  },
  createdAt: expect.stringMatching(ISO_DATE),
  likesInfo: { likesCount: 0, dislikesCount: 0, myStatus: 'None' },
};
const deviceShape = {
  ip: expect.any(String),
  title: expect.any(String),
  lastActiveDate: expect.stringMatching(ISO_DATE),
  deviceId: expect.any(String),
};
//Paginator<T> с дефолтами pageNumber=1, pageSize=10
const paginator = (items: unknown[], totalCount = items.length) => ({
  pagesCount: Math.ceil(totalCount / 10),
  page: 1,
  pageSize: 10,
  totalCount,
  items,
});

describe('API conformance (public + super admin)', () => {
  let app: INestApplication;
  let emailServiceMock: EmailServiceMock;
  const server = () => app.getHttpServer();
  const admin = (req: request.Test) => req.auth('admin', 'qwerty');
  const bearer = (req: request.Test, token: string) =>
    req.auth(token, { type: 'bearer' });
  const withCookie = (req: request.Test, refreshToken: string) =>
    req.set('Cookie', refreshTokenCookie(refreshToken));

  //сид для сценариев: юзер с парой токенов, блог, пост, комментарий
  const createUser = async (login: string) => {
    const { body } = await admin(request(server()).post('/sa/users'))
      .send({ login, email: `${login}@example.com`, password })
      .expect(201);
    const loginResponse = await request(server())
      .post('/auth/login')
      .set('User-Agent', `agent-of-${login}`)
      .send({ loginOrEmail: login, password })
      .expect(200);
    return {
      id: body.id as string,
      login,
      accessToken: loginResponse.body.accessToken as string,
      refreshToken: extractRefreshToken(loginResponse),
    };
  };
  const createBlog = async (input: Partial<typeof blogInput> = {}) =>
    (
      await admin(request(server()).post('/sa/blogs'))
        .send({ ...blogInput, ...input })
        .expect(201)
    ).body;
  const createPost = async (
    blogId: string,
    input: Partial<typeof postInput> = {},
  ) =>
    (
      await admin(request(server()).post(`/sa/blogs/${blogId}/posts`))
        .send({ ...postInput, ...input })
        .expect(201)
    ).body;
  const createComment = async (postId: string, accessToken: string) =>
    (
      await bearer(
        request(server()).post(`/posts/${postId}/comments`),
        accessToken,
      )
        .send({ content: commentContent })
        .expect(201)
    ).body;

  beforeAll(async () => {
    ({ app, emailServiceMock } = await initSettings('api-conformance'));
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(async () => {
    await deleteAllData(app);
    emailServiceMock.clear();
  });

  describe('routes outside the contract are absent', () => {
    it.each([
      ['get', '/users'],
      ['post', '/users'],
      ['get', '/users/1'],
      ['put', '/users/1'],
      ['delete', '/users/1'],
      ['post', '/blogs'],
      ['put', '/blogs/1'],
      ['delete', '/blogs/1'],
      ['get', '/app'],
    ] as Array<[Method, string]>)(
      '%s %s -> 404 even for the super admin',
      async (method, path) => {
        await admin(request(server())[method](path))
          .send({})
          .expect(HttpStatus.NOT_FOUND);
      },
    );
  });

  describe('super admin api requires basic auth admin:qwerty', () => {
    it.each([
      ['get', '/sa/users'],
      ['post', '/sa/users'],
      ['delete', `/sa/users/${MISSING_ID}`],
      ['get', '/sa/blogs'],
      ['post', '/sa/blogs'],
      ['put', `/sa/blogs/${MISSING_ID}`],
      ['delete', `/sa/blogs/${MISSING_ID}`],
      ['get', `/sa/blogs/${MISSING_ID}/posts`],
      ['post', `/sa/blogs/${MISSING_ID}/posts`],
      ['put', `/sa/blogs/${MISSING_ID}/posts/${MISSING_ID}`],
      ['delete', `/sa/blogs/${MISSING_ID}/posts/${MISSING_ID}`],
    ] as Array<[Method, string]>)(
      '%s %s -> 401 without credentials and with wrong ones',
      async (method, path) => {
        await request(server())[method](path).send({}).expect(401);
        await request(server())
          [method](path)
          .auth('admin', 'wrong')
          .send({})
          .expect(401);
      },
    );
  });

  describe('public write endpoints require a bearer access token', () => {
    it.each([
      ['get', '/auth/me'],
      ['put', `/posts/${MISSING_ID}/like-status`],
      ['post', `/posts/${MISSING_ID}/comments`],
      ['put', `/comments/${MISSING_ID}`],
      ['delete', `/comments/${MISSING_ID}`],
      ['put', `/comments/${MISSING_ID}/like-status`],
    ] as Array<[Method, string]>)(
      '%s %s -> 401 without a token and with a garbage token',
      async (method, path) => {
        await request(server())[method](path).send({}).expect(401);
        await bearer(request(server())[method](path), 'garbage.token.value')
          .send({})
          .expect(401);
      },
    );
  });

  describe('refresh-token endpoints require the refreshToken cookie', () => {
    it.each([
      ['post', '/auth/refresh-token'],
      ['post', '/auth/logout'],
      ['get', '/security/devices'],
      ['delete', '/security/devices'],
      ['delete', `/security/devices/${MISSING_DEVICE_ID}`],
    ] as Array<[Method, string]>)(
      '%s %s -> 401 without the cookie and with a garbage cookie',
      async (method, path) => {
        await request(server())[method](path).expect(401);
        await withCookie(request(server())[method](path), 'garbage').expect(
          401,
        );
      },
    );
  });

  describe('400 responses use { errorsMessages: [{ message, field }] }', () => {
    //пустое тело → по одной ошибке на каждое обязательное поле (stopAtFirstError)
    const bodyCases: Array<[Method, string, string[], boolean]> = [
      ['post', '/sa/users', ['login', 'password', 'email'], true],
      ['post', '/sa/blogs', ['name', 'description', 'websiteUrl'], true],
      [
        'put',
        '/sa/blogs/{blogId}',
        ['name', 'description', 'websiteUrl'],
        true,
      ],
      [
        'post',
        '/sa/blogs/{blogId}/posts',
        ['title', 'shortDescription', 'content'],
        true,
      ],
      [
        'put',
        '/sa/blogs/{blogId}/posts/{postId}',
        ['title', 'shortDescription', 'content'],
        true,
      ],
      ['post', '/auth/registration', ['login', 'password', 'email'], false],
      ['post', '/auth/registration-confirmation', ['code'], false],
      ['post', '/auth/registration-email-resending', ['email'], false],
      ['post', '/auth/password-recovery', ['email'], false],
      ['post', '/auth/new-password', ['newPassword', 'recoveryCode'], false],
      ['post', '/auth/login', ['loginOrEmail'], false],
    ];
    it.each(bodyCases)(
      '%s %s with an empty body -> 400 listing %j',
      async (method, template, fields, asAdmin) => {
        const blog = template.includes('{blogId}') ? await createBlog() : null;
        const post =
          template.includes('{postId}') && blog
            ? await createPost(blog.id)
            : null;
        const path = template
          .replace('{blogId}', blog?.id ?? '')
          .replace('{postId}', post?.id ?? '');
        const req = request(server())[method](path);
        const { body } = await (asAdmin ? admin(req) : req)
          .send({})
          .expect(400);
        expect(body).toEqual({
          errorsMessages: fields.map((field) => ({
            message: expect.any(String),
            field,
          })),
        });
      },
    );

    it('bearer-protected bodies are validated after auth: content and likeStatus', async () => {
      const user = await createUser('author');
      const blog = await createBlog();
      const post = await createPost(blog.id);
      const comment = await createComment(post.id, user.accessToken);
      const cases: Array<[Method, string, string]> = [
        ['post', `/posts/${post.id}/comments`, 'content'],
        ['put', `/comments/${comment.id}`, 'content'],
        ['put', `/posts/${post.id}/like-status`, 'likeStatus'],
        ['put', `/comments/${comment.id}/like-status`, 'likeStatus'],
      ];
      for (const [method, path, field] of cases) {
        const { body } = await bearer(
          request(server())[method](path),
          user.accessToken,
        )
          .send({})
          .expect(400);
        expect(body).toEqual({
          errorsMessages: [{ message: expect.any(String), field }],
        });
      }
    });

    it('field limits: comment content 20..300, blog name <= 15, websiteUrl https, post title <= 30', async () => {
      const user = await createUser('author');
      const blog = await createBlog();
      const post = await createPost(blog.id);
      const shortComment = await bearer(
        request(server()).post(`/posts/${post.id}/comments`),
        user.accessToken,
      )
        .send({ content: 'too short' })
        .expect(400);
      expect(shortComment.body.errorsMessages).toEqual([
        { message: expect.any(String), field: 'content' },
      ]);
      const badBlog = await admin(request(server()).post('/sa/blogs'))
        .send({
          name: 'x'.repeat(16),
          description: 'd',
          websiteUrl: 'http://insecure.example.com',
        })
        .expect(400);
      expect(
        badBlog.body.errorsMessages.map((e: { field: string }) => e.field),
      ).toEqual(['name', 'websiteUrl']);
      const badPost = await admin(
        request(server()).post(`/sa/blogs/${blog.id}/posts`),
      )
        .send({ ...postInput, title: 'x'.repeat(31) })
        .expect(400);
      expect(badPost.body.errorsMessages).toEqual([
        { message: expect.any(String), field: 'title' },
      ]);
    });

    it('duplicate login or email on POST /sa/users and /auth/registration -> 400 with the field', async () => {
      await createUser('taken');
      for (const path of ['/sa/users', '/auth/registration']) {
        const req = request(server()).post(path);
        const { body } = await (path.startsWith('/sa') ? admin(req) : req)
          .send({ login: 'taken', email: 'fresh@example.com', password })
          .expect(400);
        expect(body).toEqual({
          errorsMessages: [{ message: expect.any(String), field: 'login' }],
        });
        const sameEmail = request(server()).post(path);
        const { body: emailBody } = await (
          path.startsWith('/sa') ? admin(sameEmail) : sameEmail
        )
          .send({ login: 'fresh', email: 'taken@example.com', password })
          .expect(400);
        expect(emailBody).toEqual({
          errorsMessages: [{ message: expect.any(String), field: 'email' }],
        });
      }
    });
  });

  describe('super admin users', () => {
    it('POST /sa/users -> 201 UserViewModel; GET /sa/users -> Paginator with defaults, newest first', async () => {
      const first = await admin(request(server()).post('/sa/users'))
        .send({ login: 'first', email: 'first@example.com', password })
        .expect(201);
      expect(first.body).toEqual({
        ...userShape,
        login: 'first',
        email: 'first@example.com',
      });
      await admin(request(server()).post('/sa/users'))
        .send({ login: 'second', email: 'second@example.com', password })
        .expect(201);
      const { body } = await admin(request(server()).get('/sa/users')).expect(
        200,
      );
      expect(body).toEqual(paginator([userShape, userShape]));
      expect(body.items.map((u: { login: string }) => u.login)).toEqual([
        'second',
        'first',
      ]);
    });

    it('GET /sa/users: searchLoginTerm OR searchEmailTerm (case-insensitive), sortBy, sortDirection, pageSize, pageNumber', async () => {
      for (const login of ['alpha', 'beta', 'gamma']) {
        await admin(request(server()).post('/sa/users'))
          .send({ login, email: `${login}@example.com`, password })
          .expect(201);
      }
      const search = await admin(request(server()).get('/sa/users'))
        .query({
          searchLoginTerm: 'ALP',
          searchEmailTerm: 'BETA@',
          sortBy: 'login',
          sortDirection: 'asc',
        })
        .expect(200);
      expect(search.body.items.map((u: { login: string }) => u.login)).toEqual([
        'alpha',
        'beta',
      ]);
      const page = await admin(request(server()).get('/sa/users'))
        .query({
          sortBy: 'login',
          sortDirection: 'asc',
          pageSize: 2,
          pageNumber: 2,
        })
        .expect(200);
      expect(page.body).toEqual({
        pagesCount: 2,
        page: 2,
        pageSize: 2,
        totalCount: 3,
        items: [{ ...userShape, login: 'gamma' }],
      });
    });

    it('DELETE /sa/users/:id -> 204, then 404; malformed ids -> 404', async () => {
      const user = await createUser('victim');
      await admin(request(server()).delete(`/sa/users/${user.id}`)).expect(204);
      await admin(request(server()).delete(`/sa/users/${user.id}`)).expect(404);
      await admin(request(server()).get('/sa/users'))
        .expect(200)
        .expect(({ body }) => expect(body.totalCount).toBe(0));
      for (const id of [MISSING_ID, ...MALFORMED_IDS]) {
        await admin(request(server()).delete(`/sa/users/${id}`)).expect(404);
      }
    });
  });

  describe('super admin and public blogs', () => {
    it('POST /sa/blogs -> 201 BlogViewModel with isMembership=false; visible via GET /sa/blogs, GET /blogs, GET /blogs/:id', async () => {
      const blog = await createBlog();
      expect(blog).toEqual({ ...blogShape, ...blogInput, isMembership: false });
      for (const path of ['/sa/blogs', '/blogs']) {
        const req = request(server()).get(path);
        const { body } = await (
          path.startsWith('/sa') ? admin(req) : req
        ).expect(200);
        expect(body).toEqual(paginator([blog]));
      }
      const { body } = await request(server())
        .get(`/blogs/${blog.id}`)
        .expect(200);
      expect(body).toEqual(blog);
    });

    it('GET /blogs and GET /sa/blogs: searchNameTerm (case-insensitive), sortBy name asc, pagination', async () => {
      for (const name of ['Alpha', 'beta', 'alphabet']) {
        await createBlog({ name });
      }
      for (const path of ['/blogs', '/sa/blogs']) {
        const req = request(server()).get(path);
        const { body } = await (path.startsWith('/sa') ? admin(req) : req)
          .query({
            searchNameTerm: 'ALPH',
            sortBy: 'name',
            sortDirection: 'asc',
          })
          .expect(200);
        expect(body.items.map((b: { name: string }) => b.name)).toEqual([
          'Alpha',
          'alphabet',
        ]);
        expect(body.totalCount).toBe(2);
      }
      const page = await request(server())
        .get('/blogs')
        .query({ pageSize: 2, pageNumber: 2 })
        .expect(200);
      expect(page.body).toEqual({
        pagesCount: 2,
        page: 2,
        pageSize: 2,
        totalCount: 3,
        items: [blogShape],
      });
    });

    it('PUT /sa/blogs/:id -> 204 and the change is visible; DELETE -> 204 and then 404 everywhere', async () => {
      const blog = await createBlog();
      const update = {
        name: 'Renamed',
        description: 'new description',
        websiteUrl: 'https://example.org/new',
      };
      await admin(request(server()).put(`/sa/blogs/${blog.id}`))
        .send(update)
        .expect(204);
      const { body } = await request(server())
        .get(`/blogs/${blog.id}`)
        .expect(200);
      expect(body).toEqual({ ...blog, ...update });
      await admin(request(server()).delete(`/sa/blogs/${blog.id}`)).expect(204);
      await request(server()).get(`/blogs/${blog.id}`).expect(404);
      await admin(request(server()).delete(`/sa/blogs/${blog.id}`)).expect(404);
      await admin(request(server()).put(`/sa/blogs/${blog.id}`))
        .send(update)
        .expect(404);
      const list = await request(server()).get('/blogs').expect(200);
      expect(list.body).toEqual(paginator([]));
    });

    it.each([MISSING_ID, ...MALFORMED_IDS])(
      'unknown blog id %s -> 404 on GET /blogs/:id, GET /blogs/:id/posts, GET/POST /sa/blogs/:id/posts, PUT/DELETE /sa/blogs/:id',
      async (id) => {
        await request(server()).get(`/blogs/${id}`).expect(404);
        await request(server()).get(`/blogs/${id}/posts`).expect(404);
        await admin(request(server()).get(`/sa/blogs/${id}/posts`)).expect(404);
        await admin(request(server()).post(`/sa/blogs/${id}/posts`))
          .send(postInput)
          .expect(404);
        await admin(request(server()).put(`/sa/blogs/${id}`))
          .send(blogInput)
          .expect(404);
        await admin(request(server()).delete(`/sa/blogs/${id}`)).expect(404);
      },
    );
  });

  describe('super admin and public posts', () => {
    it('POST /sa/blogs/:blogId/posts -> 201 PostViewModel with blogName and empty extendedLikesInfo', async () => {
      const blog = await createBlog();
      const post = await createPost(blog.id);
      expect(post).toEqual({
        ...postShape,
        ...postInput,
        blogId: blog.id,
        blogName: blog.name,
      });
      for (const [path, asAdmin] of [
        [`/sa/blogs/${blog.id}/posts`, true],
        [`/blogs/${blog.id}/posts`, false],
        ['/posts', false],
      ] as Array<[string, boolean]>) {
        const req = request(server()).get(path);
        const { body } = await (asAdmin ? admin(req) : req).expect(200);
        expect(body).toEqual(paginator([post]));
      }
      const { body } = await request(server())
        .get(`/posts/${post.id}`)
        .expect(200);
      expect(body).toEqual(post);
    });

    it('post lists: newest first by default, sortBy title asc, pageSize/pageNumber', async () => {
      const blog = await createBlog();
      for (const title of ['b', 'c', 'a']) {
        await createPost(blog.id, { title });
      }
      const defaults = await request(server()).get('/posts').expect(200);
      expect(
        defaults.body.items.map((p: { title: string }) => p.title),
      ).toEqual(['a', 'c', 'b']);
      const sorted = await request(server())
        .get(`/blogs/${blog.id}/posts`)
        .query({ sortBy: 'title', sortDirection: 'asc', pageSize: 2 })
        .expect(200);
      expect(sorted.body).toEqual({
        pagesCount: 2,
        page: 1,
        pageSize: 2,
        totalCount: 3,
        items: [
          { ...postShape, title: 'a' },
          { ...postShape, title: 'b' },
        ],
      });
      const page2 = await admin(
        request(server()).get(`/sa/blogs/${blog.id}/posts`),
      )
        .query({
          sortBy: 'title',
          sortDirection: 'asc',
          pageSize: 2,
          pageNumber: 2,
        })
        .expect(200);
      expect(page2.body.items.map((p: { title: string }) => p.title)).toEqual([
        'c',
      ]);
    });

    it('PUT /sa/blogs/:blogId/posts/:postId -> 204 and visible; DELETE -> 204 then 404', async () => {
      const blog = await createBlog();
      const post = await createPost(blog.id);
      const update = {
        title: 'Updated',
        shortDescription: 'updated description',
        content: 'updated content',
      };
      await admin(
        request(server()).put(`/sa/blogs/${blog.id}/posts/${post.id}`),
      )
        .send(update)
        .expect(204);
      const { body } = await request(server())
        .get(`/posts/${post.id}`)
        .expect(200);
      expect(body).toEqual({ ...post, ...update });
      await admin(
        request(server()).delete(`/sa/blogs/${blog.id}/posts/${post.id}`),
      ).expect(204);
      await request(server()).get(`/posts/${post.id}`).expect(404);
      await admin(
        request(server()).delete(`/sa/blogs/${blog.id}/posts/${post.id}`),
      ).expect(404);
      await admin(
        request(server()).put(`/sa/blogs/${blog.id}/posts/${post.id}`),
      )
        .send(update)
        .expect(404);
    });

    it('post under another blog or unknown post id -> 404 on PUT/DELETE /sa/blogs/:blogId/posts/:postId', async () => {
      const blog = await createBlog();
      const otherBlog = await createBlog({ name: 'Other' });
      const post = await createPost(blog.id);
      await admin(
        request(server()).put(`/sa/blogs/${otherBlog.id}/posts/${post.id}`),
      )
        .send(postInput)
        .expect(404);
      await admin(
        request(server()).delete(`/sa/blogs/${otherBlog.id}/posts/${post.id}`),
      ).expect(404);
      for (const id of [MISSING_ID, ...MALFORMED_IDS]) {
        await admin(request(server()).put(`/sa/blogs/${blog.id}/posts/${id}`))
          .send(postInput)
          .expect(404);
        await admin(
          request(server()).delete(`/sa/blogs/${blog.id}/posts/${id}`),
        ).expect(404);
      }
    });

    it.each([MISSING_ID, ...MALFORMED_IDS])(
      'unknown post id %s -> 404 on GET /posts/:id, GET/POST /posts/:id/comments, PUT /posts/:id/like-status',
      async (id) => {
        const user = await createUser('reader');
        await request(server()).get(`/posts/${id}`).expect(404);
        await request(server()).get(`/posts/${id}/comments`).expect(404);
        await bearer(
          request(server()).post(`/posts/${id}/comments`),
          user.accessToken,
        )
          .send({ content: commentContent })
          .expect(404);
        await bearer(
          request(server()).put(`/posts/${id}/like-status`),
          user.accessToken,
        )
          .send({ likeStatus: 'Like' })
          .expect(404);
      },
    );

    it('PUT /posts/:id/like-status -> 204; extendedLikesInfo and newestLikes reflect it, myStatus depends on the token', async () => {
      const user = await createUser('liker');
      const blog = await createBlog();
      const post = await createPost(blog.id);
      await bearer(
        request(server()).put(`/posts/${post.id}/like-status`),
        user.accessToken,
      )
        .send({ likeStatus: 'Like' })
        .expect(204);
      const mine = await bearer(
        request(server()).get(`/posts/${post.id}`),
        user.accessToken,
      ).expect(200);
      expect(mine.body.extendedLikesInfo).toEqual({
        likesCount: 1,
        dislikesCount: 0,
        myStatus: 'Like',
        newestLikes: [
          {
            addedAt: expect.stringMatching(ISO_DATE),
            userId: user.id,
            login: user.login,
          },
        ],
      });
      const anonymous = await request(server())
        .get(`/posts/${post.id}`)
        .expect(200);
      expect(anonymous.body.extendedLikesInfo.myStatus).toBe('None');
      expect(anonymous.body.extendedLikesInfo.likesCount).toBe(1);
    });
  });

  describe('comments', () => {
    it('POST /posts/:postId/comments -> 201 CommentViewModel; GET /posts/:postId/comments -> Paginator; GET /comments/:id', async () => {
      const user = await createUser('author');
      const blog = await createBlog();
      const post = await createPost(blog.id);
      const comment = await createComment(post.id, user.accessToken);
      expect(comment).toEqual({
        ...commentShape,
        content: commentContent,
        commentatorInfo: { userId: user.id, userLogin: user.login },
      });
      const list = await request(server())
        .get(`/posts/${post.id}/comments`)
        .expect(200);
      expect(list.body).toEqual(paginator([comment]));
      const single = await request(server())
        .get(`/comments/${comment.id}`)
        .expect(200);
      expect(single.body).toEqual(comment);
    });

    it('PUT /comments/:id -> 204 and visible; DELETE -> 204 then 404; foreign comment -> 403', async () => {
      const author = await createUser('author');
      const stranger = await createUser('stranger');
      const blog = await createBlog();
      const post = await createPost(blog.id);
      const comment = await createComment(post.id, author.accessToken);
      const updated = { content: 'Updated content that is long enough too' };
      await bearer(
        request(server()).put(`/comments/${comment.id}`),
        stranger.accessToken,
      )
        .send(updated)
        .expect(403);
      await bearer(
        request(server()).delete(`/comments/${comment.id}`),
        stranger.accessToken,
      ).expect(403);
      await bearer(
        request(server()).put(`/comments/${comment.id}`),
        author.accessToken,
      )
        .send(updated)
        .expect(204);
      const { body } = await request(server())
        .get(`/comments/${comment.id}`)
        .expect(200);
      expect(body).toEqual({ ...comment, ...updated });
      await bearer(
        request(server()).delete(`/comments/${comment.id}`),
        author.accessToken,
      ).expect(204);
      await request(server()).get(`/comments/${comment.id}`).expect(404);
      await bearer(
        request(server()).delete(`/comments/${comment.id}`),
        author.accessToken,
      ).expect(404);
      const list = await request(server())
        .get(`/posts/${post.id}/comments`)
        .expect(200);
      expect(list.body).toEqual(paginator([]));
    });

    it.each([MISSING_ID, ...MALFORMED_IDS])(
      'unknown comment id %s -> 404 on GET, PUT, DELETE /comments/:id and PUT /comments/:id/like-status',
      async (id) => {
        const user = await createUser('reader');
        await request(server()).get(`/comments/${id}`).expect(404);
        await bearer(request(server()).put(`/comments/${id}`), user.accessToken)
          .send({ content: commentContent })
          .expect(404);
        await bearer(
          request(server()).delete(`/comments/${id}`),
          user.accessToken,
        ).expect(404);
        await bearer(
          request(server()).put(`/comments/${id}/like-status`),
          user.accessToken,
        )
          .send({ likeStatus: 'Like' })
          .expect(404);
      },
    );

    it('PUT /comments/:id/like-status -> 204; likesInfo reflects Like/Dislike/None and myStatus per token', async () => {
      const author = await createUser('author');
      const voter = await createUser('voter');
      const blog = await createBlog();
      const post = await createPost(blog.id);
      const comment = await createComment(post.id, author.accessToken);
      const vote = (token: string, likeStatus: string) =>
        bearer(
          request(server()).put(`/comments/${comment.id}/like-status`),
          token,
        )
          .send({ likeStatus })
          .expect(204);
      await vote(author.accessToken, 'Like');
      await vote(voter.accessToken, 'Dislike');
      const asVoter = await bearer(
        request(server()).get(`/comments/${comment.id}`),
        voter.accessToken,
      ).expect(200);
      expect(asVoter.body.likesInfo).toEqual({
        likesCount: 1,
        dislikesCount: 1,
        myStatus: 'Dislike',
      });
      await vote(voter.accessToken, 'None');
      const anonymous = await request(server())
        .get(`/posts/${post.id}/comments`)
        .expect(200);
      expect(anonymous.body.items[0].likesInfo).toEqual({
        likesCount: 1,
        dislikesCount: 0,
        myStatus: 'None',
      });
    });
  });

  describe('auth', () => {
    const registration = {
      login: 'newbie',
      email: 'newbie@example.com',
      password,
    };

    //контракт не требует блокировать логин до подтверждения — проверяем только
    //то, что в нём есть: коды, письмо и повторное использование кода
    it('registration -> 204 and a confirmation email; confirmation -> 204; resending/confirming again -> 400', async () => {
      await request(server())
        .post('/auth/registration')
        .send(registration)
        .expect(204);
      const code = emailServiceMock.getLastConfirmationCode();
      await request(server())
        .post('/auth/registration-email-resending')
        .send({ email: registration.email })
        .expect(204);
      const resentCode = emailServiceMock.getLastConfirmationCode();
      await request(server())
        .post('/auth/registration-confirmation')
        .send({ code: resentCode })
        .expect(204);
      const reused = await request(server())
        .post('/auth/registration-confirmation')
        .send({ code })
        .expect(400);
      expect(reused.body).toEqual({
        errorsMessages: [{ message: expect.any(String), field: 'code' }],
      });
      const resendConfirmed = await request(server())
        .post('/auth/registration-email-resending')
        .send({ email: registration.email })
        .expect(400);
      expect(resendConfirmed.body).toEqual({
        errorsMessages: [{ message: expect.any(String), field: 'email' }],
      });
      await request(server())
        .post('/auth/login')
        .send({ loginOrEmail: registration.email, password })
        .expect(200);
    });

    it('login -> 200 { accessToken } and refreshToken cookie (HttpOnly, Secure) not in the body; wrong password -> 401', async () => {
      await createUser('member');
      const response = await request(server())
        .post('/auth/login')
        .send({ loginOrEmail: 'member', password })
        .expect(200);
      expect(response.body).toEqual({ accessToken: expect.any(String) });
      const cookie = getRefreshTokenCookieAttributes(response);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/Secure/i);
      await request(server())
        .post('/auth/login')
        .send({ loginOrEmail: 'member', password: 'wrong-password' })
        .expect(401);
      await request(server())
        .post('/auth/login')
        .send({ loginOrEmail: 'nobody', password })
        .expect(401);
    });

    it('GET /auth/me -> { email, login, userId }', async () => {
      const user = await createUser('member');
      const { body } = await bearer(
        request(server()).get('/auth/me'),
        user.accessToken,
      ).expect(200);
      expect(body).toEqual({
        email: 'member@example.com',
        login: 'member',
        userId: user.id,
      });
    });

    it('refresh-token -> 200 with a new pair, old refresh token is revoked; logout -> 204 and the token is revoked', async () => {
      const user = await createUser('member');
      const refreshed = await withCookie(
        request(server()).post('/auth/refresh-token'),
        user.refreshToken,
      ).expect(200);
      expect(refreshed.body).toEqual({ accessToken: expect.any(String) });
      const newRefreshToken = extractRefreshToken(refreshed);
      expect(newRefreshToken).not.toBe(user.refreshToken);
      await withCookie(
        request(server()).post('/auth/refresh-token'),
        user.refreshToken,
      ).expect(401);
      await withCookie(
        request(server()).post('/auth/logout'),
        newRefreshToken,
      ).expect(204);
      await withCookie(
        request(server()).post('/auth/logout'),
        newRefreshToken,
      ).expect(401);
      await withCookie(
        request(server()).get('/security/devices'),
        newRefreshToken,
      ).expect(401);
    });

    it('password-recovery -> 204 (also for unknown email); new-password -> 204 and the old password stops working; bad code -> 400', async () => {
      await createUser('member');
      await request(server())
        .post('/auth/password-recovery')
        .send({ email: 'unknown@example.com' })
        .expect(204);
      await request(server())
        .post('/auth/password-recovery')
        .send({ email: 'member@example.com' })
        .expect(204);
      const recoveryCode = emailServiceMock.getLastRecoveryCode();
      const badCode = await request(server())
        .post('/auth/new-password')
        .send({ newPassword: 'newPassword1', recoveryCode: 'wrong-code' })
        .expect(400);
      expect(badCode.body).toEqual({
        errorsMessages: [
          { message: expect.any(String), field: 'recoveryCode' },
        ],
      });
      await request(server())
        .post('/auth/new-password')
        .send({ newPassword: 'newPassword1', recoveryCode })
        .expect(204);
      await request(server())
        .post('/auth/login')
        .send({ loginOrEmail: 'member', password })
        .expect(401);
      await request(server())
        .post('/auth/login')
        .send({ loginOrEmail: 'member', password: 'newPassword1' })
        .expect(200);
    });

    it('ip-restriction is off: 10 rapid logins -> no 429; access token lives at least 5 minutes', async () => {
      await createUser('member');
      let accessToken = '';
      for (let n = 0; n < 10; n++) {
        const { body } = await request(server())
          .post('/auth/login')
          .send({ loginOrEmail: 'member', password })
          .expect(200);
        accessToken = body.accessToken;
      }
      const [, payload] = accessToken.split('.');
      const { exp, iat } = JSON.parse(
        Buffer.from(payload, 'base64url').toString(),
      ) as { exp: number; iat: number };
      expect(exp - iat).toBeGreaterThanOrEqual(300);
    });
  });

  describe('security devices', () => {
    it('GET /security/devices -> DeviceViewModel[] of the current user; DELETE all others -> 204 keeps only the current', async () => {
      const first = await createUser('member');
      const second = await request(server())
        .post('/auth/login')
        .set('User-Agent', 'second-device')
        .send({ loginOrEmail: 'member', password })
        .expect(200);
      const secondRefresh = extractRefreshToken(second);
      const { body } = await withCookie(
        request(server()).get('/security/devices'),
        first.refreshToken,
      ).expect(200);
      expect(body).toEqual([deviceShape, deviceShape]);
      expect(body.map((d: { title: string }) => d.title)).toEqual([
        'agent-of-member',
        'second-device',
      ]);
      await withCookie(
        request(server()).delete('/security/devices'),
        first.refreshToken,
      ).expect(204);
      const after = await withCookie(
        request(server()).get('/security/devices'),
        first.refreshToken,
      ).expect(200);
      expect(after.body).toEqual([
        { ...deviceShape, title: 'agent-of-member' },
      ]);
      await withCookie(
        request(server()).get('/security/devices'),
        secondRefresh,
      ).expect(401);
    });

    it('DELETE /security/devices/:deviceId -> 204 own, 403 foreign, 404 unknown', async () => {
      const owner = await createUser('owner');
      const stranger = await createUser('stranger');
      const second = await request(server())
        .post('/auth/login')
        .set('User-Agent', 'second-device')
        .send({ loginOrEmail: 'owner', password })
        .expect(200);
      const devices = await withCookie(
        request(server()).get('/security/devices'),
        owner.refreshToken,
      ).expect(200);
      const secondDevice = devices.body.find(
        (d: { title: string }) => d.title === 'second-device',
      ) as { deviceId: string };
      await withCookie(
        request(server()).delete(`/security/devices/${secondDevice.deviceId}`),
        stranger.refreshToken,
      ).expect(403);
      await withCookie(
        request(server()).delete(`/security/devices/${MISSING_DEVICE_ID}`),
        owner.refreshToken,
      ).expect(404);
      await withCookie(
        request(server()).delete(`/security/devices/${secondDevice.deviceId}`),
        owner.refreshToken,
      ).expect(204);
      await withCookie(
        request(server()).post('/auth/refresh-token'),
        extractRefreshToken(second),
      ).expect(401);
      const remaining = await withCookie(
        request(server()).get('/security/devices'),
        owner.refreshToken,
      ).expect(200);
      expect(remaining.body).toHaveLength(1);
    });
  });

  describe('testing', () => {
    it('DELETE /testing/all-data -> 204 and every collection is empty', async () => {
      const user = await createUser('member');
      const blog = await createBlog();
      const post = await createPost(blog.id);
      await createComment(post.id, user.accessToken);
      await request(server()).delete('/testing/all-data').expect(204);
      const users = await admin(request(server()).get('/sa/users')).expect(200);
      expect(users.body).toEqual(paginator([]));
      const blogs = await request(server()).get('/blogs').expect(200);
      expect(blogs.body).toEqual(paginator([]));
      const posts = await request(server()).get('/posts').expect(200);
      expect(posts.body).toEqual(paginator([]));
      await request(server()).get(`/posts/${post.id}/comments`).expect(404);
      await withCookie(
        request(server()).get('/security/devices'),
        user.refreshToken,
      ).expect(401);
    });
  });
});
