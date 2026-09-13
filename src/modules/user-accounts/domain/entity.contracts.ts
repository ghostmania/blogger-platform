import { UpdateUserDto } from '../dto/create-user.dto';
import { Name } from './name.schema';
import { EmailConfirmation } from './email-confirmation.schema';
import { PasswordRecovery } from './password-recovery.schema';

/**
 * Контракты доменных сущностей — то общее, что есть и у монго-версии,
 * и у SQL-версии.
 *
 * Благодаря им use case'ы и view-DTO не знают, с какой базой работают:
 * они видят только поведение сущности, а не способ её хранения.
 * UserDocument (mongoose) и UserSqlEntity оба подходят под UserEntity
 * структурно — реализовывать интерфейс явно им не нужно.
 */
export interface UserEntity {
  //в монго это виртуальное поле поверх _id, в SQL — bigserial, отданный строкой
  readonly id: string;
  login: string;
  email: string;
  passwordHash: string;
  emailConfirmation: EmailConfirmation;
  passwordRecovery: PasswordRecovery;
  name: Name;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  update(dto: UpdateUserDto): void;
  makeDeleted(): void;
  setConfirmationCode(code: string, expirationDate: Date): void;
  confirmEmail(): void;
  setPasswordRecoveryCode(code: string, expirationDate: Date): void;
  updatePassword(passwordHash: string): void;
}

export interface DeviceSessionEntity {
  userId: string;
  deviceId: string;
  ip: string;
  title: string;
  lastActiveDate: Date;
  expirationDate: Date;

  refresh(lastActiveDate: Date, expirationDate: Date, ip: string): void;
  isIssuedAt(lastActiveDate: string): boolean;
}
