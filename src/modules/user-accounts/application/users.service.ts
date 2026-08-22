import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { User, UserModelType } from '../domain/user.entity';
import { CreateUserDto, UpdateUserDto } from '../dto/create-user.dto';
import { UsersRepository } from '../infrastructure/users.repository';
import { EmailService } from '../../notifications/email.service';
import { CryptoService } from './crypto.service';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';

//сроки жизни кодов из писем
const CONFIRMATION_CODE_TTL_MS = 24 * 60 * 60 * 1000; //24 часа
const RECOVERY_CODE_TTL_MS = 60 * 60 * 1000; //1 час

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    //инжектирование модели в сервис через DI
    @InjectModel(User.name)
    private UserModel: UserModelType,
    private usersRepository: UsersRepository,
    private emailService: EmailService,
    private cryptoService: CryptoService,
  ) {}

  //создаёт НЕподтверждённого юзера — используется флоу регистрации
  async createUser(dto: CreateUserDto): Promise<Types.ObjectId> {
    await this.ensureLoginAndEmailAreUnique(dto.login, dto.email);

    const passwordHash = await this.cryptoService.createPasswordHash(
      dto.password,
    );

    const user = this.UserModel.createInstance({
      email: dto.email,
      login: dto.login,
      passwordHash: passwordHash,
    });

    try {
      await this.usersRepository.save(user);
    } catch (error: unknown) {
      //страховка от гонки: два параллельных запроса могли пройти пре-чек уникальности,
      //но уникальный индекс в БД пропустит только одного — второму отдаём 400
      this.throwIfDuplicateKeyError(error);
      throw error;
    }

    return user._id;
  }

  //создание юзера суперадмином: подтверждение email не требуется
  async createConfirmedUser(dto: CreateUserDto): Promise<Types.ObjectId> {
    const userId = await this.createUser(dto);

    const user = await this.usersRepository.findOrNotFoundFail(userId);
    user.confirmEmail();
    await this.usersRepository.save(user);

    return userId;
  }

  async updateUser(id: Types.ObjectId, dto: UpdateUserDto): Promise<string> {
    const user = await this.usersRepository.findOrNotFoundFail(id);

    // не присваиваем св-ва сущностям напрямую в сервисах! даже для изменения одного св-ва
    // создаём метод
    user.update(dto); // change detection

    await this.usersRepository.save(user);

    return user._id.toString();
  }

  async deleteUser(id: string) {
    const user = await this.usersRepository.findOrNotFoundFail(
      new Types.ObjectId(id),
    );

    user.makeDeleted();

    await this.usersRepository.save(user);
  }

  async registerUser(dto: CreateUserDto): Promise<void> {
    const createdUserId = await this.createUser(dto);

    const confirmCode = randomUUID();

    const user = await this.usersRepository.findOrNotFoundFail(createdUserId);

    user.setConfirmationCode(
      confirmCode,
      new Date(Date.now() + CONFIRMATION_CODE_TTL_MS),
    );
    await this.usersRepository.save(user);

    await this.trySendEmail(
      () => this.emailService.sendConfirmationEmail(user.email, confirmCode),
      'Failed to send confirmation email',
    );
  }

  async confirmRegistration(code: string): Promise<void> {
    const user = await this.usersRepository.findByConfirmationCode(code);

    if (!user || user.emailConfirmation.isConfirmed) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Confirmation code is incorrect',
        extensions: [
          { message: 'Confirmation code is incorrect', key: 'code' },
        ],
      });
    }

    if (
      !user.emailConfirmation.expirationDate ||
      user.emailConfirmation.expirationDate < new Date()
    ) {
      throw new DomainException({
        code: DomainExceptionCode.ConfirmationCodeExpired,
        message: 'Confirmation code is expired',
        extensions: [{ message: 'Confirmation code is expired', key: 'code' }],
      });
    }

    user.confirmEmail();
    await this.usersRepository.save(user);
  }

  async resendConfirmationEmail(email: string): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);

    if (!user || user.emailConfirmation.isConfirmed) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Email is already confirmed or does not exist',
        extensions: [
          {
            message: 'Email is already confirmed or does not exist',
            key: 'email',
          },
        ],
      });
    }

    const confirmCode = randomUUID();
    user.setConfirmationCode(
      confirmCode,
      new Date(Date.now() + CONFIRMATION_CODE_TTL_MS),
    );
    await this.usersRepository.save(user);

    await this.trySendEmail(
      () => this.emailService.sendConfirmationEmail(user.email, confirmCode),
      'Failed to send confirmation email',
    );
  }

  async recoverPassword(email: string): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      //даже для незарегистрированного email отвечаем 204,
      //чтобы нельзя было перебором выяснить, какие email есть в системе
      return;
    }

    const recoveryCode = randomUUID();
    user.setPasswordRecoveryCode(
      recoveryCode,
      new Date(Date.now() + RECOVERY_CODE_TTL_MS),
    );
    await this.usersRepository.save(user);

    await this.trySendEmail(
      () =>
        this.emailService.sendPasswordRecoveryEmail(user.email, recoveryCode),
      'Failed to send password recovery email',
    );
  }

  async setNewPassword(newPassword: string, recoveryCode: string) {
    const user =
      await this.usersRepository.findByPasswordRecoveryCode(recoveryCode);

    if (!user) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Recovery code is incorrect',
        extensions: [
          { message: 'Recovery code is incorrect', key: 'recoveryCode' },
        ],
      });
    }

    if (
      !user.passwordRecovery.expirationDate ||
      user.passwordRecovery.expirationDate < new Date()
    ) {
      throw new DomainException({
        code: DomainExceptionCode.PasswordRecoveryCodeExpired,
        message: 'Recovery code is expired',
        extensions: [
          { message: 'Recovery code is expired', key: 'recoveryCode' },
        ],
      });
    }

    const passwordHash =
      await this.cryptoService.createPasswordHash(newPassword);
    user.updatePassword(passwordHash);

    await this.usersRepository.save(user);
  }

  //отправку писем ОБЯЗАТЕЛЬНО ждём: на serverless (Vercel) контейнер замораживается
  //сразу после ответа, и «фоновый» промис отправки не доживает до конца — письмо не уходит,
  //а зависший SMTP-коннект оставляет инстанс нерабочим для следующих запросов.
  //При этом сбой доставки не ломает сценарий: юзер создан, код сохранён, письмо можно перезапросить
  private async trySendEmail(
    send: () => Promise<void>,
    errorMessage: string,
  ): Promise<void> {
    try {
      await send();
    } catch (error: unknown) {
      this.logger.error(errorMessage, error);
    }
  }

  //login и email должны быть уникальны; иначе 400
  private async ensureLoginAndEmailAreUnique(login: string, email: string) {
    const [userWithSameLogin, userWithSameEmail] = await Promise.all([
      this.usersRepository.findByLogin(login),
      this.usersRepository.findByEmail(email),
    ]);

    if (userWithSameLogin) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'User with the same login already exists',
        extensions: [
          { message: 'User with the same login already exists', key: 'login' },
        ],
      });
    }

    if (userWithSameEmail) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'User with the same email already exists',
        extensions: [
          { message: 'User with the same email already exists', key: 'email' },
        ],
      });
    }
  }

  //E11000 duplicate key от mongo → 400 с указанием поля из нарушенного индекса
  private throwIfDuplicateKeyError(error: unknown): void {
    const isDuplicateKeyError =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: unknown }).code === 11000;

    if (!isDuplicateKeyError) {
      return;
    }

    const keyPattern =
      'keyPattern' in error
        ? (error as { keyPattern: Record<string, unknown> }).keyPattern
        : {};
    const field = 'email' in keyPattern ? 'email' : 'login';

    throw new DomainException({
      code: DomainExceptionCode.BadRequest,
      message: `User with the same ${field} already exists`,
      extensions: [
        { message: `User with the same ${field} already exists`, key: field },
      ],
    });
  }
}
