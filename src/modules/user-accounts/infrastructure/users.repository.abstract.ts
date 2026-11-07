import { UserEntity } from '../domain/entity.contracts';
import { CreateUserDomainDto } from '../domain/dto/create-user.domain.dto';

/** Контракт репозитория пользователей и DI-токен. */
export abstract class UsersRepository {
  abstract createInstance(dto: CreateUserDomainDto): UserEntity;

  abstract save(user: UserEntity): Promise<void>;

  abstract findById(id: string): Promise<UserEntity | null>;

  abstract findOrNotFoundFail(id: string): Promise<UserEntity>;

  abstract findByLogin(login: string): Promise<UserEntity | null>;

  abstract findByEmail(email: string): Promise<UserEntity | null>;

  abstract findByLoginOrEmail(loginOrEmail: string): Promise<UserEntity | null>;

  abstract findByConfirmationCode(code: string): Promise<UserEntity | null>;

  abstract findByPasswordRecoveryCode(code: string): Promise<UserEntity | null>;

  abstract deleteById(id: string): Promise<void>;
}
