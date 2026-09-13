import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateUserDto } from '../../dto/create-user.dto';
import { UsersRepository } from '../../infrastructure/users.repository.abstract';
import { CryptoService } from '../crypto.service';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

//нарушение уникальности: у монго свой код ошибки, у Postgres — свой.
//Use case общий для обеих реализаций, поэтому понимает оба
const MONGO_DUPLICATE_KEY = 11000;
const POSTGRES_UNIQUE_VIOLATION = '23505';

export class CreateUserCommand {
  constructor(public dto: CreateUserDto) {}
}

//создаёт НЕподтверждённого юзера — база для регистрации и для создания юзера админом
@CommandHandler(CreateUserCommand)
export class CreateUserUseCase
  implements ICommandHandler<CreateUserCommand, string>
{
  constructor(
    //никакой модели мангуста: сущность создаёт репозиторий, потому что
    //способ её создания зависит от хранилища, а бизнес-правила — нет
    private usersRepository: UsersRepository,
    private cryptoService: CryptoService,
  ) {}

  async execute({ dto }: CreateUserCommand): Promise<string> {
    await this.ensureLoginAndEmailAreUnique(dto.login, dto.email);

    const passwordHash = await this.cryptoService.createPasswordHash(
      dto.password,
    );

    const user = this.usersRepository.createInstance({
      email: dto.email,
      login: dto.login,
      passwordHash,
    });

    try {
      await this.usersRepository.save(user);
    } catch (error: unknown) {
      //страховка от гонки: два параллельных запроса могли пройти пре-чек
      //уникальности, но уникальный индекс пропустит только одного
      this.throwIfDuplicateKeyError(error);
      throw error;
    }

    return user.id;
  }

  //login и email должны быть уникальны; иначе 400
  private async ensureLoginAndEmailAreUnique(login: string, email: string) {
    const [userWithSameLogin, userWithSameEmail] = await Promise.all([
      this.usersRepository.findByLogin(login),
      this.usersRepository.findByEmail(email),
    ]);

    if (userWithSameLogin) {
      throw this.buildDuplicateException('login');
    }

    if (userWithSameEmail) {
      throw this.buildDuplicateException('email');
    }
  }

  /**
   * Определяет нарушенное поле по ошибке драйвера и отдаёт 400.
   * Монго сообщает его в keyPattern, Postgres — в имени индекса (constraint).
   */
  private throwIfDuplicateKeyError(error: unknown): void {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return;
    }

    const code = (error as { code: unknown }).code;

    if (code === MONGO_DUPLICATE_KEY) {
      const keyPattern =
        'keyPattern' in error
          ? (error as { keyPattern: Record<string, unknown> }).keyPattern
          : {};

      throw this.buildDuplicateException(
        'email' in keyPattern ? 'email' : 'login',
      );
    }

    if (code === POSTGRES_UNIQUE_VIOLATION) {
      const constraint =
        'constraint' in error
          ? String((error as { constraint: unknown }).constraint)
          : '';

      throw this.buildDuplicateException(
        constraint.includes('email') ? 'email' : 'login',
      );
    }
  }

  private buildDuplicateException(field: 'login' | 'email'): DomainException {
    const message = `User with the same ${field} already exists`;

    return new DomainException({
      code: DomainExceptionCode.BadRequest,
      message,
      extensions: [{ message, key: field }],
    });
  }
}
