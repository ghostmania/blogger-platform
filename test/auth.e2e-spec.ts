import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UsersTestManager } from './helpers/users-test-manager';
import { initSettings } from './helpers/init-settings';
import { deleteAllData } from './helpers/delete-all-data';
import { EmailServiceMock } from './mock/email-service.mock';
import { CreateUserDto } from '../src/modules/user-accounts/dto/create-user.dto';

const userInput: CreateUserDto = {
  login: 'user1',
  password: 'password123',
  email: 'user1@example.com',
};

describe('auth', () => {
  let app: INestApplication;
  let userTestManger: UsersTestManager;
  let emailServiceMock: EmailServiceMock;

  beforeAll(async () => {
    const result = await initSettings('nest-bloggers-platform-test-auth');
    app = result.app;
    userTestManger = result.userTestManger;
    emailServiceMock = result.emailServiceMock;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    emailServiceMock.clear();
    await deleteAllData(app);
  });

  describe('registration', () => {
    it('should register user without really send email', async () => {
      await userTestManger.registerUser(userInput);

      const { body: responseBody } = await request(app.getHttpServer())
        .get(`/users`)
        .auth('admin', 'qwerty')
        .expect(HttpStatus.OK);

      expect(responseBody.totalCount).toBe(1);
      expect(responseBody.items[0].login).toBe(userInput.login);
    });

    it('should call email sending method while registration', async () => {
      const sendEmailMethod = jest.spyOn(
        emailServiceMock,
        'sendConfirmationEmail',
      );

      await userTestManger.registerUser(userInput);

      expect(sendEmailMethod).toHaveBeenCalledWith(
        userInput.email,
        expect.any(String),
      );
    });

    it('should return 400 if login or email already taken', async () => {
      await userTestManger.registerUser(userInput);

      const { body: sameLoginBody } = await request(app.getHttpServer())
        .post(`/auth/registration`)
        .send({ ...userInput, email: 'other@example.com' })
        .expect(HttpStatus.BAD_REQUEST);
      expect(sameLoginBody.errorsMessages).toEqual([
        { message: expect.any(String), field: 'login' },
      ]);

      const { body: sameEmailBody } = await request(app.getHttpServer())
        .post(`/auth/registration`)
        .send({ ...userInput, login: 'other' })
        .expect(HttpStatus.BAD_REQUEST);
      expect(sameEmailBody.errorsMessages).toEqual([
        { message: expect.any(String), field: 'email' },
      ]);
    });

    it('should return validation errors for incorrect input', async () => {
      const { body: responseBody } = await request(app.getHttpServer())
        .post(`/auth/registration`)
        .send({ login: 'a b c', password: '12345', email: 'invalid' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(responseBody.errorsMessages).toEqual(
        expect.arrayContaining([
          { message: expect.any(String), field: 'login' },
          { message: expect.any(String), field: 'password' },
          { message: expect.any(String), field: 'email' },
        ]),
      );
    });
  });

  describe('registration-confirmation', () => {
    it('should confirm registration by code from email', async () => {
      await userTestManger.registerUser(userInput);
      const code = emailServiceMock.getLastConfirmationCode();

      await request(app.getHttpServer())
        .post(`/auth/registration-confirmation`)
        .send({ code })
        .expect(HttpStatus.NO_CONTENT);
    });

    it('should return 400 if code already applied or incorrect', async () => {
      await userTestManger.registerUser(userInput);
      const code = emailServiceMock.getLastConfirmationCode();

      await request(app.getHttpServer())
        .post(`/auth/registration-confirmation`)
        .send({ code })
        .expect(HttpStatus.NO_CONTENT);

      const { body: reusedBody } = await request(app.getHttpServer())
        .post(`/auth/registration-confirmation`)
        .send({ code })
        .expect(HttpStatus.BAD_REQUEST);
      expect(reusedBody.errorsMessages).toEqual([
        { message: expect.any(String), field: 'code' },
      ]);

      await request(app.getHttpServer())
        .post(`/auth/registration-confirmation`)
        .send({ code: 'non-existing-code' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('registration-email-resending', () => {
    it('should resend email with new confirmation code, new code works', async () => {
      await userTestManger.registerUser(userInput);
      const firstCode = emailServiceMock.getLastConfirmationCode();

      await request(app.getHttpServer())
        .post(`/auth/registration-email-resending`)
        .send({ email: userInput.email })
        .expect(HttpStatus.NO_CONTENT);

      const newCode = emailServiceMock.getLastConfirmationCode();
      expect(newCode).not.toBe(firstCode);

      await request(app.getHttpServer())
        .post(`/auth/registration-confirmation`)
        .send({ code: newCode })
        .expect(HttpStatus.NO_CONTENT);
    });

    it('should return 400 for unknown email or already confirmed email', async () => {
      const { body: unknownBody } = await request(app.getHttpServer())
        .post(`/auth/registration-email-resending`)
        .send({ email: 'unknown@example.com' })
        .expect(HttpStatus.BAD_REQUEST);
      expect(unknownBody.errorsMessages).toEqual([
        { message: expect.any(String), field: 'email' },
      ]);

      await userTestManger.registerUser(userInput);
      await request(app.getHttpServer())
        .post(`/auth/registration-confirmation`)
        .send({ code: emailServiceMock.getLastConfirmationCode() })
        .expect(HttpStatus.NO_CONTENT);

      await request(app.getHttpServer())
        .post(`/auth/registration-email-resending`)
        .send({ email: userInput.email })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('login', () => {
    it('should login by login and by email', async () => {
      await userTestManger.registerUser(userInput);

      const byLogin = await userTestManger.login(
        userInput.login,
        userInput.password,
      );
      expect(byLogin.accessToken).toEqual(expect.any(String));

      const byEmail = await userTestManger.login(
        userInput.email,
        userInput.password,
      );
      expect(byEmail.accessToken).toEqual(expect.any(String));
    });

    it('should return 401 for wrong password or unknown user', async () => {
      await userTestManger.registerUser(userInput);

      await userTestManger.login(
        userInput.login,
        'wrong-password',
        HttpStatus.UNAUTHORIZED,
      );

      await userTestManger.login(
        'ghost',
        userInput.password,
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('should return validation errors for empty input', async () => {
      const { body: responseBody } = await request(app.getHttpServer())
        .post(`/auth/login`)
        .send({})
        .expect(HttpStatus.BAD_REQUEST);

      expect(responseBody.errorsMessages).toEqual([
        { message: expect.any(String), field: 'loginOrEmail' },
      ]);
    });
  });

  describe('me', () => {
    it('should return current user info', async () => {
      await userTestManger.registerUser(userInput);
      const { accessToken } = await userTestManger.login(
        userInput.login,
        userInput.password,
      );

      const responseBody = await userTestManger.me(accessToken);

      expect(responseBody).toEqual({
        email: userInput.email,
        login: userInput.login,
        userId: expect.any(String),
      });
    });

    it('should return 401 without token or with invalid token', async () => {
      await request(app.getHttpServer())
        .get(`/auth/me`)
        .expect(HttpStatus.UNAUTHORIZED);

      await userTestManger.me('invalid.token.here', HttpStatus.UNAUTHORIZED);
    });
  });

  describe('password-recovery / new-password', () => {
    it('should recover password: email sent, new password set and works', async () => {
      await userTestManger.registerUser(userInput);

      await request(app.getHttpServer())
        .post(`/auth/password-recovery`)
        .send({ email: userInput.email })
        .expect(HttpStatus.NO_CONTENT);

      const recoveryCode = emailServiceMock.getLastRecoveryCode();
      const newPassword = 'newPassword123';

      await request(app.getHttpServer())
        .post(`/auth/new-password`)
        .send({ newPassword, recoveryCode })
        .expect(HttpStatus.NO_CONTENT);

      //новый пароль работает, старый — нет
      await userTestManger.login(userInput.login, newPassword);
      await userTestManger.login(
        userInput.login,
        userInput.password,
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('should return 204 for unknown email (no user enumeration), email is not sent', async () => {
      const sendEmailMethod = jest.spyOn(
        emailServiceMock,
        'sendPasswordRecoveryEmail',
      );

      await request(app.getHttpServer())
        .post(`/auth/password-recovery`)
        .send({ email: 'unknown@example.com' })
        .expect(HttpStatus.NO_CONTENT);

      expect(sendEmailMethod).not.toHaveBeenCalled();
    });

    it('should return 400 for already used recoveryCode', async () => {
      await userTestManger.registerUser(userInput);

      await request(app.getHttpServer())
        .post(`/auth/password-recovery`)
        .send({ email: userInput.email })
        .expect(HttpStatus.NO_CONTENT);
      const recoveryCode = emailServiceMock.getLastRecoveryCode();

      await request(app.getHttpServer())
        .post(`/auth/new-password`)
        .send({ newPassword: 'newPassword123', recoveryCode })
        .expect(HttpStatus.NO_CONTENT);

      const { body: reusedBody } = await request(app.getHttpServer())
        .post(`/auth/new-password`)
        .send({ newPassword: 'anotherPassword1', recoveryCode })
        .expect(HttpStatus.BAD_REQUEST);
      expect(reusedBody.errorsMessages).toEqual([
        { message: expect.any(String), field: 'recoveryCode' },
      ]);
    });

    it('should return validation error for too short newPassword', async () => {
      const { body: responseBody } = await request(app.getHttpServer())
        .post(`/auth/new-password`)
        .send({ newPassword: '123', recoveryCode: 'some-code' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(responseBody.errorsMessages).toEqual([
        { message: expect.any(String), field: 'newPassword' },
      ]);
    });
  });
});
