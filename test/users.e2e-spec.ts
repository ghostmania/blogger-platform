import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { pipesSetup } from '../src/setup/pipes.setup';

//отдельная БД на спеку — параллельные spec-файлы не затирают данные друг друга
const TEST_MONGO_URI =
  'mongodb://localhost:27017/nest-bloggers-platform-test-users';
const NON_EXISTENT_ID = '63189b06003380064c4193be';

const userInput = {
  login: 'user1',
  password: 'password123',
  email: 'user1@example.com',
};

describe('Users API (e2e) — without auth and validation', () => {
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

  const createUser = async (input = userInput) => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send(input)
      .expect(201);
    return res.body;
  };

  describe('POST -> /users', () => {
    it('should create new user; status 201; content: created user (no firstName/lastName)', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send(userInput)
        .expect(201);

      //строгое соответствие — никаких лишних полей (firstName/lastName)
      expect(res.body).toEqual({
        id: expect.any(String),
        login: userInput.login,
        email: userInput.email,
        createdAt: expect.any(String),
      });
    });
  });

  describe('GET -> /users', () => {
    it('should return status 200; content: users array with pagination', async () => {
      await createUser({
        ...userInput,
        login: 'userA',
        email: 'a@example.com',
      });
      await createUser({
        ...userInput,
        login: 'userB',
        email: 'b@example.com',
      });

      const res = await request(app.getHttpServer()).get('/users').expect(200);

      expect(res.body).toEqual({
        pagesCount: 1,
        page: 1,
        pageSize: 10,
        totalCount: 2,
        items: expect.any(Array),
      });
      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0]).toEqual({
        id: expect.any(String),
        login: expect.any(String),
        email: expect.any(String),
        createdAt: expect.any(String),
      });
    });
  });

  describe('DELETE -> /users/:id', () => {
    it('should delete user by id; status 204', async () => {
      const created = await createUser();

      await request(app.getHttpServer())
        .delete(`/users/${created.id}`)
        .expect(204);

      const res = await request(app.getHttpServer()).get('/users').expect(200);
      expect(res.body.totalCount).toBe(0);
    });

    it('should return 404 if :id not found', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${NON_EXISTENT_ID}`)
        .expect(404);
    });
  });
});
