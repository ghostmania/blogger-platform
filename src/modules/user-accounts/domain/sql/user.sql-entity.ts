import { UpdateUserDto } from '../../dto/create-user.dto';
import { CreateUserDomainDto } from '../dto/create-user.domain.dto';
import { Name } from '../name.schema';
import { EmailConfirmation } from '../email-confirmation.schema';
import { PasswordRecovery } from '../password-recovery.schema';

/**
 * SQL-версия сущности User.
 *
 * Отличия от монго-версии (domain/user.entity.ts) — ровно два:
 *  1. нет декораторов @Schema/@Prop и нет наследования от mongoose-документа:
 *     это обычный класс, ORM за ним не стоит;
 *  2. появился fromRow() — маппинг ПЛОСКОЙ строки таблицы во вложенную
 *     доменную структуру. В монго вложенность хранилась как есть, здесь
 *     emailConfirmation/passwordRecovery/name разложены по колонкам.
 *
 * Всё поведение (инварианты) — то же самое, потому что бизнес-правила
 * от способа хранения не зависят. Это и есть смысл выделения домена.
 */

//строка таблицы users в том виде, в каком её отдаёт node-postgres.
//id — bigserial, а int8 драйвер отдаёт СТРОКОЙ, чтобы не терять точность
export type UserRow = {
  id: string;
  login: string;
  email: string;
  password_hash: string;
  confirmation_code: string | null;
  confirmation_expiration: Date | null;
  is_confirmed: boolean;
  recovery_code: string | null;
  recovery_expiration: Date | null;
  first_name: string | null;
  last_name: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export class UserSqlEntity {
  /**
   * Пустая строка = сущность ещё не в БД.
   * Мангуст отличал новый документ от существующего сам (isNew), здесь эту
   * роль играет id: репозиторий по нему выбирает INSERT или UPDATE.
   */
  id: string = '';
  login: string;
  passwordHash: string;
  email: string;
  emailConfirmation: EmailConfirmation;
  passwordRecovery: PasswordRecovery;
  name: Name;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null = null;

  /**
   * DDD: как создать сущность, чтобы она не нарушала бизнес-правила.
   * Пользователь ВСЕГДА должен после регистрации подтвердить свой email.
   */
  static createInstance(dto: CreateUserDomainDto): UserSqlEntity {
    const user = new this();

    user.login = dto.login;
    user.email = dto.email;
    user.passwordHash = dto.passwordHash;

    user.emailConfirmation = {
      confirmationCode: null,
      expirationDate: null,
      isConfirmed: false,
    };

    user.passwordRecovery = {
      recoveryCode: null,
      expirationDate: null,
    };

    user.name = {
      firstName: 'firstName xxx',
      lastName: 'lastName yyy',
    };

    return user;
  }

  //разворачивает плоскую строку БД во вложенную доменную структуру
  static fromRow(row: UserRow): UserSqlEntity {
    const user = new this();

    user.id = row.id;
    user.login = row.login;
    user.email = row.email;
    user.passwordHash = row.password_hash;

    user.emailConfirmation = {
      confirmationCode: row.confirmation_code,
      expirationDate: row.confirmation_expiration,
      isConfirmed: row.is_confirmed,
    };

    user.passwordRecovery = {
      recoveryCode: row.recovery_code,
      expirationDate: row.recovery_expiration,
    };

    user.name = {
      firstName: row.first_name ?? '',
      lastName: row.last_name,
    };

    user.createdAt = row.created_at;
    user.updatedAt = row.updated_at;
    user.deletedAt = row.deleted_at;

    return user;
  }

  //DDD: состояние меняем методами сущности, а не присваиванием полей снаружи
  makeDeleted(): void {
    if (this.deletedAt !== null) {
      throw new Error('Entity already deleted');
    }
    this.deletedAt = new Date();
  }

  update(dto: UpdateUserDto): void {
    if (dto.email !== this.email) {
      this.emailConfirmation.isConfirmed = false;
      this.email = dto.email;
    }
  }

  setConfirmationCode(code: string, expirationDate: Date): void {
    if (this.emailConfirmation.isConfirmed) {
      throw new Error('Email is already confirmed');
    }
    this.emailConfirmation.confirmationCode = code;
    this.emailConfirmation.expirationDate = expirationDate;
  }

  confirmEmail(): void {
    if (this.emailConfirmation.isConfirmed) {
      throw new Error('Email is already confirmed');
    }
    this.emailConfirmation.isConfirmed = true;
    this.emailConfirmation.confirmationCode = null;
    this.emailConfirmation.expirationDate = null;
  }

  setPasswordRecoveryCode(code: string, expirationDate: Date): void {
    this.passwordRecovery.recoveryCode = code;
    this.passwordRecovery.expirationDate = expirationDate;
  }

  updatePassword(passwordHash: string): void {
    this.passwordHash = passwordHash;
    this.passwordRecovery.recoveryCode = null;
    this.passwordRecovery.expirationDate = null;
  }
}
