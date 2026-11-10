import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Pool } from 'pg';
import request from 'supertest';
import { initSettings } from './helpers/init-settings';
import { deleteAllData } from './helpers/delete-all-data';
import { PG_POOL } from '../src/core/database/database.constants';
import { Blog } from '../src/modules/bloggers-platform/blogs/domain/blog.entity';
import { Post } from '../src/modules/bloggers-platform/posts/domain/post.entity';

//Валидный по формату, но заведомо несуществующий id — должен давать 404, а не 500
const MISSING_ID = '9223372036854775807';
//За пределами int8 и нечисловой — Postgres без предварительной проверки ответил бы 22003/22P02
const INVALID_IDS = ['invalid', '9223372036854775808'];

const blogInput = {
  name: 'tech blog',
  description: 'posts about backend',
  websiteUrl: 'https://example.com/tech',
};
const postInput = {
  title: 'first post',
  shortDescription: 'short description',
  content: 'post content',
};
//пост без реакций: нули, None и пустой список последних лайков
const noReactions = {
  likesCount: 0,
  dislikesCount: 0,
  myStatus: 'None',
  newestLikes: [],
};

describe('TypeORM blogs and posts (public + super admin API)', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();
  const admin = (req: request.Test) => req.auth('admin', 'qwerty');

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

  beforeAll(async () => {
    ({ app } = await initSettings('typeorm-blogs-posts'));
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(async () => {
    await deleteAllData(app);
  });

  it('keeps synchronize off and maps Blog/Post entities onto the existing tables', async () => {
    const dataSource = app.get(DataSource);
    expect(dataSource.options.synchronize).toBe(false);
    expect(dataSource.getMetadata(Blog).tableName).toBe('blogs');
    expect(dataSource.getMetadata(Post).tableName).toBe('posts');
    //репозитории TypeORM читают те же строки, что и raw SQL
    const pool = app.get<Pool>(PG_POOL);
    await pool.query(
      `INSERT INTO blogs (id, name, description, website_url) VALUES (9007199254740993, 'legacy', 'd', 'https://legacy.com')`,
    );
    await pool.query(
      `INSERT INTO posts (title, short_description, content, blog_id, blog_name) VALUES ('t', 's', 'c', 9007199254740993, 'legacy')`,
    );
    const { body: blog } = await request(server())
      .get('/blogs/9007199254740993')
      .expect(200);
    expect(blog.id).toBe('9007199254740993');
    const { body: posts } = await request(server())
      .get('/blogs/9007199254740993/posts')
      .expect(200);
    expect(posts.items[0]).toMatchObject({
      blogId: '9007199254740993',
      blogName: 'legacy',
      extendedLikesInfo: noReactions,
    });
  });

  describe('super admin blogs', () => {
    it.each([
      ['get', '/sa/blogs'],
      ['post', '/sa/blogs'],
      ['put', `/sa/blogs/${MISSING_ID}`],
      ['delete', `/sa/blogs/${MISSING_ID}`],
      ['get', `/sa/blogs/${MISSING_ID}/posts`],
      ['post', `/sa/blogs/${MISSING_ID}/posts`],
      ['put', `/sa/blogs/${MISSING_ID}/posts/1`],
      ['delete', `/sa/blogs/${MISSING_ID}/posts/1`],
    ] as Array<['get' | 'post' | 'put' | 'delete', string]>)(
      'protects %s %s with basic auth',
      async (method, path) => {
        await request(server())[method](path).expect(401);
        await request(server())
          [method](path)
          .auth('admin', 'wrong')
          .expect(401);
      },
    );

    it('creates a blog, exposes it to the public API and persists it through TypeORM', async () => {
      const blog = await createBlog();
      expect(blog).toEqual({
        id: expect.any(String),
        ...blogInput,
        isMembership: false,
        createdAt: expect.any(String),
      });
      expect(
        await app
          .get(DataSource)
          .getRepository(Blog)
          .findOneBy({ id: blog.id }),
      ).toMatchObject({ name: blogInput.name, isMembership: false });

      const { body: byId } = await request(server())
        .get(`/blogs/${blog.id}`)
        .expect(200);
      expect(byId).toEqual(blog);

      for (const route of ['/blogs', '/sa/blogs']) {
        const { body } = await admin(request(server()).get(route)).expect(200);
        expect(body).toEqual({
          pagesCount: 1,
          page: 1,
          pageSize: 10,
          totalCount: 1,
          items: [blog],
        });
      }
    });

    it('validates blog input with the errorsMessages format', async () => {
      const { body } = await admin(request(server()).post('/sa/blogs'))
        .send({
          name: 'a'.repeat(16),
          description: '',
          websiteUrl: 'http://not-https.com',
        })
        .expect(400);
      expect(body.errorsMessages.map((error) => error.field).sort()).toEqual([
        'description',
        'name',
        'websiteUrl',
      ]);
      expect(await request(server()).get('/blogs')).toMatchObject({
        body: { totalCount: 0 },
      });
    });

    it('updates a blog and propagates the new name into its posts', async () => {
      const blog = await createBlog();
      const post = await createPost(blog.id);
      const update = {
        name: 'renamed',
        description: 'new description',
        websiteUrl: 'https://renamed.com',
      };
      await admin(request(server()).put(`/sa/blogs/${blog.id}`))
        .send(update)
        .expect(204);
      expect((await request(server()).get(`/blogs/${blog.id}`)).body).toEqual({
        ...blog,
        ...update,
      });
      expect(
        (await request(server()).get(`/posts/${post.id}`)).body.blogName,
      ).toBe('renamed');

      await admin(request(server()).put(`/sa/blogs/${blog.id}`))
        .send({ ...update, websiteUrl: 'bad url' })
        .expect(400);
      await admin(request(server()).put(`/sa/blogs/${MISSING_ID}`))
        .send(update)
        .expect(404);
    });

    it('deletes a blog together with its posts and returns 404 afterwards', async () => {
      const blog = await createBlog();
      const post = await createPost(blog.id);
      await admin(request(server()).delete(`/sa/blogs/${blog.id}`)).expect(204);
      await request(server()).get(`/blogs/${blog.id}`).expect(404);
      await request(server()).get(`/posts/${post.id}`).expect(404);
      await request(server()).get(`/blogs/${blog.id}/posts`).expect(404);
      expect(await app.get(DataSource).getRepository(Post).count()).toBe(0);
      await admin(request(server()).delete(`/sa/blogs/${blog.id}`)).expect(404);
      await admin(request(server()).delete(`/sa/blogs/${MISSING_ID}`)).expect(
        404,
      );
    });

    it('searches by name case-insensitively and paginates/sorts in byte order', async () => {
      for (const name of ['beta', 'Alpha', 'gamma', 'alpine']) {
        await createBlog({ name });
      }
      const { body: searched } = await request(server())
        .get('/blogs')
        .query({ searchNameTerm: 'ALP', sortBy: 'name', sortDirection: 'asc' })
        .expect(200);
      expect(searched.items.map((blog) => blog.name)).toEqual([
        'Alpha',
        'alpine',
      ]);
      expect(searched.totalCount).toBe(2);

      //COLLATE "C": заглавные раньше строчных, как при сортировке строк в JS
      const { body: sorted } = await admin(request(server()).get('/sa/blogs'))
        .query({ sortBy: 'name', sortDirection: 'asc', pageSize: 3 })
        .expect(200);
      expect(sorted).toMatchObject({
        pagesCount: 2,
        page: 1,
        pageSize: 3,
        totalCount: 4,
      });
      expect(sorted.items.map((blog) => blog.name)).toEqual([
        'Alpha',
        'alpine',
        'beta',
      ]);

      const { body: page2 } = await request(server())
        .get('/blogs')
        .query({
          sortBy: 'name',
          sortDirection: 'asc',
          pageSize: 3,
          pageNumber: 2,
        })
        .expect(200);
      expect(page2.items.map((blog) => blog.name)).toEqual(['gamma']);

      //дефолт — createdAt desc: последний созданный первым
      const { body: byDefault } = await request(server())
        .get('/blogs')
        .expect(200);
      expect(byDefault.items.map((blog) => blog.name)).toEqual([
        'alpine',
        'gamma',
        'Alpha',
        'beta',
      ]);

      //сортировка по websiteUrl/isMembership раньше падала на несуществующей колонке
      for (const sortBy of ['websiteUrl', 'isMembership', 'description']) {
        await request(server()).get('/blogs').query({ sortBy }).expect(200);
      }
      await request(server()).get('/blogs').query({ sortBy: 'id' }).expect(400);

      const { body: empty } = await request(server())
        .get('/blogs')
        .query({ pageNumber: 9, pageSize: 2 })
        .expect(200);
      expect(empty).toEqual({
        pagesCount: 2,
        page: 9,
        pageSize: 2,
        totalCount: 4,
        items: [],
      });
    });
  });

  describe('super admin posts of a blog', () => {
    it('creates a post without reactions and exposes it to the public API', async () => {
      const blog = await createBlog();
      const post = await createPost(blog.id);
      expect(post).toEqual({
        id: expect.any(String),
        ...postInput,
        blogId: blog.id,
        blogName: blog.name,
        createdAt: expect.any(String),
        extendedLikesInfo: noReactions,
      });

      expect((await request(server()).get(`/posts/${post.id}`)).body).toEqual(
        post,
      );
      for (const route of [
        '/posts',
        `/blogs/${blog.id}/posts`,
        `/sa/blogs/${blog.id}/posts`,
      ]) {
        const { body } = await admin(request(server()).get(route)).expect(200);
        expect(body).toEqual({
          pagesCount: 1,
          page: 1,
          pageSize: 10,
          totalCount: 1,
          items: [post],
        });
      }
    });

    it('returns 404 for a missing blog and 400 for invalid post input', async () => {
      await admin(request(server()).post(`/sa/blogs/${MISSING_ID}/posts`))
        .send(postInput)
        .expect(404);
      const blog = await createBlog();
      const { body } = await admin(
        request(server()).post(`/sa/blogs/${blog.id}/posts`),
      )
        .send({ title: 'x'.repeat(31), shortDescription: '  ', content: '' })
        .expect(400);
      expect(body.errorsMessages.map((error) => error.field).sort()).toEqual([
        'content',
        'shortDescription',
        'title',
      ]);
      //blogId в теле игнорируется (whitelist): пост принадлежит блогу из URL
      const other = await createBlog({ name: 'other' });
      const post = await createPost(blog.id, { blogId: other.id } as never);
      expect(post.blogId).toBe(blog.id);
    });

    it('updates and deletes a post only within its own blog', async () => {
      const blog = await createBlog();
      const other = await createBlog({ name: 'other' });
      const post = await createPost(blog.id);
      const update = {
        title: 'updated',
        shortDescription: 'updated short',
        content: 'updated content',
      };

      await admin(
        request(server()).put(`/sa/blogs/${other.id}/posts/${post.id}`),
      )
        .send(update)
        .expect(404);
      await admin(
        request(server()).put(`/sa/blogs/${blog.id}/posts/${MISSING_ID}`),
      )
        .send(update)
        .expect(404);
      await admin(
        request(server()).put(`/sa/blogs/${blog.id}/posts/${post.id}`),
      )
        .send({ ...update, title: '' })
        .expect(400);
      await admin(
        request(server()).put(`/sa/blogs/${blog.id}/posts/${post.id}`),
      )
        .send(update)
        .expect(204);
      expect((await request(server()).get(`/posts/${post.id}`)).body).toEqual({
        ...post,
        ...update,
      });

      await admin(
        request(server()).delete(`/sa/blogs/${other.id}/posts/${post.id}`),
      ).expect(404);
      await request(server()).get(`/posts/${post.id}`).expect(200);
      await admin(
        request(server()).delete(`/sa/blogs/${blog.id}/posts/${post.id}`),
      ).expect(204);
      await request(server()).get(`/posts/${post.id}`).expect(404);
      await admin(
        request(server()).delete(`/sa/blogs/${blog.id}/posts/${post.id}`),
      ).expect(404);
    });

    it('filters posts by blog and sorts lists by whitelisted columns', async () => {
      const first = await createBlog({ name: 'first' });
      const second = await createBlog({ name: 'second' });
      await createPost(first.id, { title: 'b title' });
      await createPost(first.id, { title: 'A title' });
      await createPost(second.id, { title: 'c title' });

      const { body: all } = await request(server()).get('/posts').expect(200);
      expect(all.totalCount).toBe(3);
      //дефолт — createdAt desc
      expect(all.items.map((post) => post.title)).toEqual([
        'c title',
        'A title',
        'b title',
      ]);

      const { body: ofFirst } = await request(server())
        .get(`/blogs/${first.id}/posts`)
        .query({ sortBy: 'title', sortDirection: 'asc' })
        .expect(200);
      expect(ofFirst.totalCount).toBe(2);
      expect(ofFirst.items.map((post) => post.title)).toEqual([
        'A title',
        'b title',
      ]);

      const { body: byBlogName } = await request(server())
        .get('/posts')
        .query({ sortBy: 'blogName', sortDirection: 'desc', pageSize: 1 })
        .expect(200);
      expect(byBlogName).toMatchObject({
        pagesCount: 3,
        totalCount: 3,
        items: [{ blogName: 'second' }],
      });

      for (const sortBy of ['shortDescription', 'content', 'blogId']) {
        await request(server()).get('/posts').query({ sortBy }).expect(200);
      }
      await request(server())
        .get('/posts')
        .query({ sortBy: 'likes' })
        .expect(400);
    });
  });

  it.each(INVALID_IDS)(
    'answers 404 without database errors for malformed id %s',
    async (id) => {
      await request(server()).get(`/blogs/${id}`).expect(404);
      await request(server()).get(`/blogs/${id}/posts`).expect(404);
      await request(server()).get(`/posts/${id}`).expect(404);
      await admin(request(server()).put(`/sa/blogs/${id}`))
        .send(blogInput)
        .expect(404);
      await admin(request(server()).delete(`/sa/blogs/${id}`)).expect(404);
      const blog = await createBlog();
      await admin(request(server()).put(`/sa/blogs/${blog.id}/posts/${id}`))
        .send(postInput)
        .expect(404);
      await admin(
        request(server()).delete(`/sa/blogs/${blog.id}/posts/${id}`),
      ).expect(404);
    },
  );

  it('testing/all-data removes blogs and posts', async () => {
    const blog = await createBlog();
    await createPost(blog.id);
    await request(server()).delete('/testing/all-data').expect(204);
    expect((await request(server()).get('/blogs')).body.totalCount).toBe(0);
    expect((await request(server()).get('/posts')).body.totalCount).toBe(0);
  });
});
