import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { pipesSetup } from '../src/setup/pipes.setup';

//отдельная БД на спеку — чтобы параллельные spec-файлы не затирали данные друг друга через deleteAll
const TEST_MONGO_URI =
  'mongodb://localhost:27017/nest-bloggers-platform-test-posts';
const NON_EXISTENT_ID = '507f1f77bcf86cd799439011';

const blogInput = {
  name: 'host blog',
  description: 'blog for posts',
  websiteUrl: 'https://someurl.com',
};

const postInput = {
  title: 'new post',
  shortDescription: 'short',
  content: 'post content',
};

describe('Posts & Comments API (e2e) — without auth', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.MONGO_URI = TEST_MONGO_URI;
    const { AppModule } = await import('../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    pipesSetup(app);
    await app.init();
  });

  beforeEach(async () => {
    await request(app.getHttpServer()).delete('/testing/all-data').expect(204);
  });

  afterAll(async () => {
    await app.close();
  });

  const createBlog = async () => {
    const res = await request(app.getHttpServer())
      .post('/blogs')
      .send(blogInput)
      .expect(201);
    return res.body;
  };

  //создаёт блог и пост в нём через /blogs/:blogId/posts, возвращает {blog, post}
  const createBlogAndPost = async () => {
    const blog = await createBlog();
    const res = await request(app.getHttpServer())
      .post(`/blogs/${blog.id}/posts`)
      .send(postInput)
      .expect(201);
    return { blog, post: res.body };
  };

  describe('POST -> /posts', () => {
    it('should create post with valid blogId; status 201; content: created post', async () => {
      const blog = await createBlog();

      const res = await request(app.getHttpServer())
        .post('/posts')
        .send({ ...postInput, blogId: blog.id })
        .expect(201);

      expect(res.body).toEqual({
        id: expect.any(String),
        title: postInput.title,
        shortDescription: postInput.shortDescription,
        content: postInput.content,
        blogId: blog.id,
        blogName: blog.name,
        createdAt: expect.any(String),
        extendedLikesInfo: {
          likesCount: 0,
          dislikesCount: 0,
          myStatus: 'None',
          newestLikes: [],
        },
      });
    });

    it('should return 400 if blogId does not exist', async () => {
      await request(app.getHttpServer())
        .post('/posts')
        .send({ ...postInput, blogId: NON_EXISTENT_ID })
        .expect(400);
    });
  });

  describe('GET -> /posts', () => {
    it('should return status 200; content: posts with pagination', async () => {
      await createBlogAndPost();
      await createBlogAndPost();

      const res = await request(app.getHttpServer()).get('/posts').expect(200);

      expect(res.body).toEqual({
        pagesCount: 1,
        page: 1,
        pageSize: 10,
        totalCount: 2,
        items: expect.any(Array),
      });
      expect(res.body.items).toHaveLength(2);
    });
  });

  describe('GET -> /posts/:id', () => {
    it('should return status 200; content: post by id', async () => {
      const { post } = await createBlogAndPost();

      const res = await request(app.getHttpServer())
        .get(`/posts/${post.id}`)
        .expect(200);

      expect(res.body).toEqual(post);
    });

    it('should return 404 if :id not found', async () => {
      await request(app.getHttpServer())
        .get(`/posts/${NON_EXISTENT_ID}`)
        .expect(404);
    });
  });

  describe('PUT -> /posts/:id', () => {
    it('should update post by id; status 204', async () => {
      const { blog, post } = await createBlogAndPost();

      const updateInput = {
        title: 'updated title',
        shortDescription: 'updated short',
        content: 'updated content',
        blogId: blog.id,
      };

      await request(app.getHttpServer())
        .put(`/posts/${post.id}`)
        .send(updateInput)
        .expect(204);

      const res = await request(app.getHttpServer())
        .get(`/posts/${post.id}`)
        .expect(200);

      expect(res.body.title).toBe(updateInput.title);
      expect(res.body.content).toBe(updateInput.content);
    });

    it('should return 404 if :id not found', async () => {
      await request(app.getHttpServer())
        .put(`/posts/${NON_EXISTENT_ID}`)
        .send({ ...postInput, blogId: NON_EXISTENT_ID })
        .expect(404);
    });
  });

  describe('DELETE -> /posts/:id', () => {
    it('should delete post by id; status 204', async () => {
      const { post } = await createBlogAndPost();

      await request(app.getHttpServer())
        .delete(`/posts/${post.id}`)
        .expect(204);

      await request(app.getHttpServer()).get(`/posts/${post.id}`).expect(404);
    });

    it('should return 404 if :id not found', async () => {
      await request(app.getHttpServer())
        .delete(`/posts/${NON_EXISTENT_ID}`)
        .expect(404);
    });
  });

  describe('POST, GET -> /blogs/:blogId/posts', () => {
    it('should create post for specific blog; status 201', async () => {
      const blog = await createBlog();

      const res = await request(app.getHttpServer())
        .post(`/blogs/${blog.id}/posts`)
        .send(postInput)
        .expect(201);

      expect(res.body).toMatchObject({
        blogId: blog.id,
        blogName: blog.name,
        title: postInput.title,
      });
    });

    it('should return 200 with pagination for blog posts', async () => {
      const { blog } = await createBlogAndPost();

      const res = await request(app.getHttpServer())
        .get(`/blogs/${blog.id}/posts`)
        .expect(200);

      expect(res.body.totalCount).toBe(1);
      expect(res.body.items[0].blogId).toBe(blog.id);
    });

    it('should return 404 if blog :blogId not found', async () => {
      await request(app.getHttpServer())
        .get(`/blogs/${NON_EXISTENT_ID}/posts`)
        .expect(404);

      await request(app.getHttpServer())
        .post(`/blogs/${NON_EXISTENT_ID}/posts`)
        .send(postInput)
        .expect(404);
    });
  });

  describe('GET -> /posts/:postId/comments', () => {
    it('should return 200 with empty pagination when no comments (no auth to create)', async () => {
      const { post } = await createBlogAndPost();

      const res = await request(app.getHttpServer())
        .get(`/posts/${post.id}/comments`)
        .expect(200);

      expect(res.body).toEqual({
        pagesCount: 0,
        page: 1,
        pageSize: 10,
        totalCount: 0,
        items: [],
      });
    });

    it('should return 404 if post :postId not found', async () => {
      await request(app.getHttpServer())
        .get(`/posts/${NON_EXISTENT_ID}/comments`)
        .expect(404);
    });
  });

  describe('GET -> /comments/:id', () => {
    it('should return 404 if comment :id not found', async () => {
      await request(app.getHttpServer())
        .get(`/comments/${NON_EXISTENT_ID}`)
        .expect(404);
    });
  });
});
