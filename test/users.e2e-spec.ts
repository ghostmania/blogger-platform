import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { UsersTestManager } from './helpers/users-test-manager';
import { initSettings } from './helpers/init-settings';
import { deleteAllData } from './helpers/delete-all-data';
import { delay } from './helpers/delay';
import { CreateUserDto } from '../src/modules/user-accounts/dto/create-user.dto';
import { PaginatedViewDto } from '../src/core/dto/base.paginated.view-dto';
import {
  MeViewDto,
  UserViewDto,
} from '../src/modules/user-accounts/api/view-dto/users.view-dto';
import { ACCESS_TOKEN_SECRET } from '../src/modules/user-accounts/constants/auth.constants';
import { ACCESS_TOKEN_STRATEGY_INJECT_TOKEN } from '../src/modules/user-accounts/constants/auth-tokens.inject-constants';
import { DomainExceptionCode } from '../src/core/exceptions/domain-exception-codes';

const NON_EXISTENT_ID = '63189b06003380064c4193be';

describe('users', () => {
  let app: INestApplication;
  let userTestManger: UsersTestManager;

  beforeAll(async () => {
    const result = await initSettings(
      'nest-bloggers-platform-test-users',
      //укорачиваем время жизни токена, чтобы протестировать протухший accessToken
      (moduleBuilder) =>
        moduleBuilder
          .overrideProvider(ACCESS_TOKEN_STRATEGY_INJECT_TOKEN)
          .useValue(
            new JwtService({
              secret: ACCESS_TOKEN_SECRET,
              signOptions: { expiresIn: '2s' },
            }),
          ),
    );
    app = result.app;
    userTestManger = result.userTestManger;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await deleteAllData(app);
  });

  it('should create user', async () => {
    const body: CreateUserDto = {
      login: 'name1',
      password: 'qwerty123',
      email: 'email@email.em',
    };

    const response = await userTestManger.createUser(body);

    //строгое соответствие swagger-спеке: никаких лишних полей
    expect(response).toEqual({
      login: body.login,
      email: body.email,
      id: expect.any(String),
      createdAt: expect.any(String),
    });
  });

  it('should return 401 while creating user without basic auth', async () => {
    await request(app.getHttpServer())
      .post(`/users`)
      .send({
        login: 'name1',
        password: 'qwerty123',
        email: 'email@email.em',
      })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('should return 401 with wrong basic auth credentials', async () => {
    await request(app.getHttpServer())
      .post(`/users`)
      .send({
        login: 'name1',
        password: 'qwerty123',
        email: 'email@email.em',
      })
      .auth('admin', 'wrong')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('should return validation errors while creating user with incorrect input', async () => {
    const { body: responseBody } = await request(app.getHttpServer())
      .post(`/users`)
      .send({ login: 'ab', password: '123', email: 'not-an-email' })
      .auth('admin', 'qwerty')
      .expect(HttpStatus.BAD_REQUEST);

    //тело 400-й ошибки по swagger-спеке: только errorsMessages с field
    expect(responseBody).toEqual({
      errorsMessages: expect.arrayContaining([
        { message: expect.any(String), field: 'login' },
        { message: expect.any(String), field: 'password' },
        { message: expect.any(String), field: 'email' },
      ]),
    });
    expect(responseBody.errorsMessages).toHaveLength(3);
  });

  it('should return 400 if login or email already exists', async () => {
    const body: CreateUserDto = {
      login: 'name1',
      password: 'qwerty123',
      email: 'email@email.em',
    };
    await userTestManger.createUser(body);

    const { body: sameLoginBody } = await request(app.getHttpServer())
      .post(`/users`)
      .send({ ...body, email: 'other@email.em' })
      .auth('admin', 'qwerty')
      .expect(HttpStatus.BAD_REQUEST);
    expect(sameLoginBody.errorsMessages).toEqual([
      { message: expect.any(String), field: 'login' },
    ]);

    const { body: sameEmailBody } = await request(app.getHttpServer())
      .post(`/users`)
      .send({ ...body, login: 'other' })
      .auth('admin', 'qwerty')
      .expect(HttpStatus.BAD_REQUEST);
    expect(sameEmailBody.errorsMessages).toEqual([
      { message: expect.any(String), field: 'email' },
    ]);
  });

  it('should get users with paging', async () => {
    const users = await userTestManger.createSeveralUsers(12);
    const { body: responseBody } = (await request(app.getHttpServer())
      .get(`/users?pageNumber=2&sortDirection=asc`)
      .auth('admin', 'qwerty')
      .expect(HttpStatus.OK)) as { body: PaginatedViewDto<UserViewDto[]> };

    expect(responseBody.totalCount).toBe(12);
    expect(responseBody.items).toHaveLength(2);
    expect(responseBody.pagesCount).toBe(2);
    //asc sorting
    expect(responseBody.items[1]).toEqual(users[users.length - 1]);
  });

  it('should return 401 while getting users without basic auth', async () => {
    await request(app.getHttpServer())
      .get(`/users`)
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('should delete user by id', async () => {
    const user = await userTestManger.createUser({
      login: 'name1',
      password: 'qwerty123',
      email: 'email@email.em',
    });

    await request(app.getHttpServer())
      .delete(`/users/${user.id}`)
      .auth('admin', 'qwerty')
      .expect(HttpStatus.NO_CONTENT);

    const { body: responseBody } = await request(app.getHttpServer())
      .get(`/users`)
      .auth('admin', 'qwerty')
      .expect(HttpStatus.OK);
    expect(responseBody.totalCount).toBe(0);
  });

  it('should return 404 while deleting non existent user', async () => {
    const { body: responseBody } = await request(app.getHttpServer())
      .delete(`/users/${NON_EXISTENT_ID}`)
      .auth('admin', 'qwerty')
      .expect(HttpStatus.NOT_FOUND);

    expect(responseBody.code).toBe(DomainExceptionCode.NotFound);
  });

  it('should return 400 while deleting user with invalid ObjectId', async () => {
    const { body: responseBody } = await request(app.getHttpServer())
      .delete(`/users/not-an-object-id`)
      .auth('admin', 'qwerty')
      .expect(HttpStatus.BAD_REQUEST);

    expect(responseBody.errorsMessages).toEqual([
      { message: expect.any(String), field: expect.any(String) },
    ]);
  });

  it('should return users info while "me" request with correct accessTokens', async () => {
    const tokens = await userTestManger.createAndLoginSeveralUsers(1);

    const responseBody = await userTestManger.me(tokens[0].accessToken);

    expect(responseBody).toEqual({
      login: expect.anything(),
      userId: expect.anything(),
      email: expect.anything(),
    } as MeViewDto);
  });

  it(`shouldn't return users info while "me" request if accessTokens expired`, async () => {
    const tokens = await userTestManger.createAndLoginSeveralUsers(1);
    await delay(2000);
    await userTestManger.me(tokens[0].accessToken, HttpStatus.UNAUTHORIZED);
  });
});
