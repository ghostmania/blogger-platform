import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { UpdateUserDto } from '../dto/create-user.dto';
import { CreateUserDomainDto } from './dto/create-user.domain.dto';
import { Name } from './name.embedded';
import { EmailConfirmation } from './email-confirmation.embedded';
import { PasswordRecovery } from './password-recovery.embedded';
import { UserEntity } from './entity.contracts';

@Entity('users')
@Index('users_login_unique_idx', ['login'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
@Index('users_email_unique_idx', ['email'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
export class User implements UserEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;
  @Column({ type: 'varchar', length: 10 })
  login: string;
  @Column({ type: 'varchar', length: 100 })
  email: string;
  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string;
  @Column(() => EmailConfirmation, { prefix: false })
  emailConfirmation: EmailConfirmation;
  @Column(() => PasswordRecovery, { prefix: false })
  passwordRecovery: PasswordRecovery;
  @Column(() => Name, { prefix: false })
  name: Name;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null = null;

  static createInstance(dto: CreateUserDomainDto): User {
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
