import { UpdateUserDto } from '../dto/create-user.dto';
import { Name } from './name.embedded';
import { EmailConfirmation } from './email-confirmation.embedded';
import { PasswordRecovery } from './password-recovery.embedded';

export interface UserEntity {
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
