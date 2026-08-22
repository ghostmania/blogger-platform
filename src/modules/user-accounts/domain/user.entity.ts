import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model } from 'mongoose';
import { UpdateUserDto } from '../dto/create-user.dto';
import { CreateUserDomainDto } from './dto/create-user.domain.dto';
import { Name, NameSchema } from './name.schema';
import {
  EmailConfirmation,
  EmailConfirmationSchema,
} from './email-confirmation.schema';
import {
  PasswordRecovery,
  PasswordRecoverySchema,
} from './password-recovery.schema';

//ограничения полей юзера по swagger-спеке — единый источник для схемы и DTO-валидации
export const loginConstraints = {
  minLength: 3,
  maxLength: 10,
  match: /^[a-zA-Z0-9_-]*$/,
};

export const passwordConstraints = {
  minLength: 6,
  maxLength: 20,
};

//паттерн из swagger-спеки: допускает плюс-адресацию (user+tag@domain.com),
//которой автотесты адресуют реальный ящик, и TLD длиннее 4 символов
export const emailConstraints = {
  match: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
};

//флаг timestemp автоматичеки добавляет поля upatedAt и createdAt
/**
 * User Entity Schema
 * This class represents the schema and behavior of a User entity.
 */
@Schema({ timestamps: true })
export class User {
  /**
   * Login of the user (must be uniq)
   * @type {string}
   * @required
   */
  @Prop({ type: String, required: true, ...loginConstraints })
  login: string;

  /**
   * Password hash for authentication
   * @type {string}
   * @required
   */
  @Prop({ type: String, required: true })
  passwordHash: string;

  /**
   * Email of the user
   * @type {string}
   * @required
   */
  @Prop({ type: String, required: true, ...emailConstraints })
  email: string;

  /**
   * Email confirmation info (code, expiration, status)
   * @type {EmailConfirmation}
   */
  @Prop({ type: EmailConfirmationSchema, required: true })
  emailConfirmation: EmailConfirmation;

  /**
   * Password recovery info (code, expiration)
   * @type {PasswordRecovery}
   */
  @Prop({ type: PasswordRecoverySchema, required: true })
  passwordRecovery: PasswordRecovery;

  // @Prop(NameSchema) this variant from docdoesn't make validation for inner object
  @Prop({ type: NameSchema })
  name: Name;

  /**
   * Creation timestamp
   * Explicitly defined despite timestamps: true
   * properties without @Prop for typescript so that they are in the class instance (or in instance methods)
   * @type {Date}
   */
  createdAt: Date;
  updatedAt: Date;

  /**
   * Deletion timestamp, nullable, if date exist, means entity soft deleted
   * @type {Date | null}
   */
  @Prop({ type: Date, nullable: true, default: null })
  deletedAt: Date | null;

  /**
   * Virtual property to get the stringified ObjectId
   * @returns {string} The string representation of the ID
   * если ипсльзуете по всей системе шв айди как string, можете юзать, если id
   */
  get id() {
    // @ts-ignore
    return this._id.toString();
  }

  /**
   * Factory method to create a User instance
   * @param {CreateUserDto} dto - The data transfer object for user creation
   * @returns {UserDocument} The created user document
   * DDD started: как создать сущность, чтобы она не нарушала бизнес-правила? Делегируем это создание статическому методу
   */
  static createInstance(dto: CreateUserDomainDto): UserDocument {
    const user = new this();
    user.email = dto.email;
    user.passwordHash = dto.passwordHash;
    user.login = dto.login;
    // пользователь ВСЕГДА должен после регистрации подтверждить свой Email
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

    return user as UserDocument;
  }

  /**
   * Marks the user as deleted
   * Throws an error if already deleted
   * @throws {Error} If the entity is already deleted
   * DDD сontinue: инкапсуляция (вызываем методы, которые меняют состояние\св-ва) объектов согласно правилам этого объекта
   */
  makeDeleted() {
    if (this.deletedAt !== null) {
      throw new Error('Entity already deleted');
    }
    this.deletedAt = new Date();
  }

  /**
   * Updates the user instance with new data
   * Resets email confirmation if email is updated
   * @param {UpdateUserDto} dto - The data transfer object for user updates
   * DDD сontinue: инкапсуляция (вызываем методы, которые меняют состояние\св-ва) объектов согласно правилам этого объекта
   */
  update(dto: UpdateUserDto) {
    if (dto.email !== this.email) {
      this.emailConfirmation.isConfirmed = false;
      this.email = dto.email;
    }
  }

  /**
   * Sets a new email confirmation code with expiration date
   * @throws {Error} If the email is already confirmed
   */
  setConfirmationCode(code: string, expirationDate: Date) {
    if (this.emailConfirmation.isConfirmed) {
      throw new Error('Email is already confirmed');
    }
    this.emailConfirmation.confirmationCode = code;
    this.emailConfirmation.expirationDate = expirationDate;
  }

  /**
   * Marks the email as confirmed
   * @throws {Error} If the email is already confirmed
   */
  confirmEmail() {
    if (this.emailConfirmation.isConfirmed) {
      throw new Error('Email is already confirmed');
    }
    this.emailConfirmation.isConfirmed = true;
    this.emailConfirmation.confirmationCode = null;
    this.emailConfirmation.expirationDate = null;
  }

  /**
   * Sets a password recovery code with expiration date
   */
  setPasswordRecoveryCode(code: string, expirationDate: Date) {
    this.passwordRecovery.recoveryCode = code;
    this.passwordRecovery.expirationDate = expirationDate;
  }

  /**
   * Sets a new password hash and clears the recovery code
   */
  updatePassword(passwordHash: string) {
    this.passwordHash = passwordHash;
    this.passwordRecovery.recoveryCode = null;
    this.passwordRecovery.expirationDate = null;
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

//уникальность login/email гарантируется на уровне БД: проверка в сервисе не защищает
//от параллельных запросов (check-then-act race). Индексы частичные — только по
//неудалённым юзерам, чтобы soft-delete не блокировал повторную регистрацию.
UserSchema.index(
  { login: 1 },
  { unique: true, partialFilterExpression: { deletedAt: { $type: 'null' } } },
);
UserSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { deletedAt: { $type: 'null' } } },
);

//регистрирует методы сущности в схеме
UserSchema.loadClass(User);

//Типизация документа
export type UserDocument = HydratedDocument<User>;

//Типизация модели + статические методы
export type UserModelType = Model<UserDocument> & typeof User;
