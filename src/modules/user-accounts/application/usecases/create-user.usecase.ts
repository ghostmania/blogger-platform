import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { User, UserModelType } from '../../domain/user.entity';
import { CreateUserDto } from '../../dto/create-user.dto';
import { UsersRepository } from '../../infrastructure/users.repository';
import { CryptoService } from '../crypto.service';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

export class CreateUserCommand {
  constructor(public dto: CreateUserDto) {}
}

//создаёт НЕподтверждённого юзера — база для регистрации и для создания юзера админом
@CommandHandler(CreateUserCommand)
export class CreateUserUseCase implements ICommandHandler<
  CreateUserCommand,
  Types.ObjectId
> {
  constructor(
    //инжектирование модели через DI
    @InjectModel(User.name)
    private UserModel: UserModelType,
    private usersRepository: UsersRepository,
    private cryptoService: CryptoService,
  ) {}

  async execute({ dto }: CreateUserCommand): Promise<Types.ObjectId> {
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
