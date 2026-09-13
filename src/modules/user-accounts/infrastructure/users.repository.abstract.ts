import { UserEntity } from '../domain/entity.contracts';
import { CreateUserDomainDto } from '../domain/dto/create-user.domain.dto';

/**
 * Контракт репозитория юзеров.
 *
 * Абстрактный класс, а не interface, потому что он одновременно служит
 * DI-токеном: в UserAccountsModule под него подставляется либо
 * UsersMongoRepository, либо UsersSqlRepository — ОДНОЙ строкой.
 *
 * createInstance живёт здесь, а не в use case, потому что фабрика сущности
 * зависит от хранилища: монго создаёт документ через модель, SQL — через
 * статический метод обычного класса. Всё остальное поведение одинаково.
 */
export abstract class UsersRepository {
  abstract createInstance(dto: CreateUserDomainDto): UserEntity;

  abstract save(user: UserEntity): Promise<void>;

  abstract findById(id: string): Promise<UserEntity | null>;

  abstract findOrNotFoundFail(id: string): Promise<UserEntity>;

  abstract findByLogin(login: string): Promise<UserEntity | null>;

  abstract findByEmail(email: string): Promise<UserEntity | null>;

  abstract findByLoginOrEmail(loginOrEmail: string): Promise<UserEntity | null>;

  abstract findByConfirmationCode(code: string): Promise<UserEntity | null>;

  abstract findByPasswordRecoveryCode(
    code: string,
  ): Promise<UserEntity | null>;
}
