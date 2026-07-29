import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { pipesSetup } from '../src/setup/pipes.setup';

// Изолированная тестовая БД — тесты (и DELETE /testing/all-data) не трогают dev-данные.
const TEST_MONGO_URI = 'mongodb://localhost:27017/nest-bloggers-platform-test';

// Валидный по формату, но заведомо несуществующий ObjectId — чтобы получить 404, а не CastError 500.
const NON_EXISTENT_ID = '507f1f77bcf86cd799439011';

const validBlogInput = {
  name: 'new blog',
  description: 'description',
  websiteUrl: 'https://someurl.com',
};

describe('Blogs API (e2e) — without auth and validation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.MONGO_URI = TEST_MONGO_URI;

    //динамический импорт: AppModule.forRoot читает MONGO_URI на этапе импорта,
    //поэтому переменную окружения надо выставить ДО импорта модуля
    const { AppModule } = await import('../src/app.module');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    pipesSetup(app); //глобальный ValidationPipe с transform (роуты в корне, без префикса)
    await app.init();
  });

  beforeEach(async () => {
    //чистим БД перед каждым тестом
    await request(app.getHttpServer()).delete('/testing/all-data').expect(204);
  });

  afterAll(async () => {
    await app.close();
  });

  //хелпер: создаёт блог и возвращает его view
  const createBlog = async (input = validBlogInput) => {
    const res = await request(app.getHttpServer())
      .post('/blogs')
      .send(input)
      .expect(201);

    return res.body;
  };

  describe('DELETE -> /testing/all-data', () => {
    it('should remove all data; status 204', async () => {
      await createBlog();

      await request(app.getHttpServer())
        .delete('/testing/all-data')
        .expect(204);

      const res = await request(app.getHttpServer()).get('/blogs').expect(200);

      expect(res.body.items).toHaveLength(0);
      expect(res.body.totalCount).toBe(0);
    });
  });

  describe('POST -> /blogs', () => {
    it('should create new blog; status 201; content: created blog', async () => {
      const res = await request(app.getHttpServer())
        .post('/blogs')
        .send(validBlogInput)
        .expect(201);

      expect(res.body).toEqual({
        id: expect.any(String),
        name: validBlogInput.name,
        description: validBlogInput.description,
        websiteUrl: validBlogInput.websiteUrl,
        isMembership: false,
        createdAt: expect.any(String),
      });

      //дополнительный метод: GET -> /blogs/:id должен вернуть созданный блог
      const getRes = await request(app.getHttpServer())
        .get(`/blogs/${res.body.id}`)
        .expect(200);

      expect(getRes.body).toEqual(res.body);
    });
  });

  describe('GET -> /blogs', () => {
    it('should return status 200; content: blog array with pagination', async () => {
      await createBlog({ ...validBlogInput, name: 'blog 1' });
      await createBlog({ ...validBlogInput, name: 'blog 2' });

      const res = await request(app.getHttpServer()).get('/blogs').expect(200);

      expect(res.body).toEqual({
        pagesCount: 1,
        page: 1,
        pageSize: 10,
        totalCount: 2,
        items: expect.any(Array),
      });
      expect(res.body.items).toHaveLength(2);
    });

    it('should filter by searchNameTerm', async () => {
      await createBlog({ ...validBlogInput, name: 'apple blog' });
      await createBlog({ ...validBlogInput, name: 'banana blog' });

      const res = await request(app.getHttpServer())
        .get('/blogs')
        .query({ searchNameTerm: 'apple' })
        .expect(200);

      expect(res.body.totalCount).toBe(1);
      expect(res.body.items[0].name).toBe('apple blog');
    });
  });

  describe('GET -> /blogs/:id', () => {
    it('should return status 200; content: blog by id', async () => {
      const created = await createBlog();

      const res = await request(app.getHttpServer())
        .get(`/blogs/${created.id}`)
        .expect(200);

      expect(res.body).toEqual(created);
    });

    it('should return 404 if :id not found', async () => {
      await request(app.getHttpServer())
        .get(`/blogs/${NON_EXISTENT_ID}`)
        .expect(404);
    });
  });

  describe('PUT -> /blogs/:id', () => {
    it('should update blog by id; status 204', async () => {
      const created = await createBlog();

      const updateInput = {
        name: 'updated name',
        description: 'updated description',
        websiteUrl: 'https://updated.com',
      };

      await request(app.getHttpServer())
        .put(`/blogs/${created.id}`)
        .send(updateInput)
        .expect(204);

      //дополнительный метод: GET -> /blogs/:id отражает изменения
      const res = await request(app.getHttpServer())
        .get(`/blogs/${created.id}`)
        .expect(200);

      expect(res.body).toEqual({
        ...created,
        ...updateInput,
      });
    });

    it('should return 404 if :id not found', async () => {
      await request(app.getHttpServer())
        .put(`/blogs/${NON_EXISTENT_ID}`)
        .send(validBlogInput)
        .expect(404);
    });
  });

  describe('DELETE -> /blogs/:id', () => {
    it('should delete blog by id; status 204', async () => {
      const created = await createBlog();

      await request(app.getHttpServer())
        .delete(`/blogs/${created.id}`)
        .expect(204);

      //удалённый блог больше не доступен
      await request(app.getHttpServer())
        .get(`/blogs/${created.id}`)
        .expect(404);
    });

    it('should return 404 if :id not found', async () => {
      await request(app.getHttpServer())
        .delete(`/blogs/${NON_EXISTENT_ID}`)
        .expect(404);
    });
  });

  //блог-специфичные посты ещё не реализованы (posts controller — заглушка).
  //включить, когда будет готов posts-модуль. CreatePostForBlogInputDto уже создан.
  describe.skip('blog-scoped posts (pending posts implementation)', () => {
    it.todo('POST -> /blogs/:blogId/posts should create post; status 201');
    it.todo('GET -> /blogs/:blogId/posts should return 200 with pagination');
    it.todo(
      'POST, GET -> /blogs/:blogId/posts should return 404 if blog not found',
    );
  });
});
