import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';

import { User, UserSchema } from './domain/user.entity';
import {
  DeviceSession,
  DeviceSessionSchema,
} from './domain/device-session.entity';
import { UsersController } from './api/users.controller';
import { AuthController } from './api/auth.controller';
import { SecurityDevicesController } from './api/security-devices.controller';

import { UsersRepository } from './infrastructure/users.repository.abstract';
// import { UsersMongoRepository } from './infrastructure/users.mongo-repository';
import { UsersSqlRepository } from './infrastructure/sql/users.sql-repository';
import { SecurityDevicesRepository } from './infrastructure/security-devices.repository.abstract';
import { SecurityDevicesMongoRepository } from './infrastructure/security-devices.mongo-repository';
import { SecurityDevicesSqlRepository } from './infrastructure/sql/security-devices.sql-repository';
import { UsersQueryRepository } from './infrastructure/query/users.query-repository.abstract';
import { UsersMongoQueryRepository } from './infrastructure/query/users.mongo-query-repository';
import { UsersSqlQueryRepository } from './infrastructure/sql/query/users.sql-query-repository';
import { SecurityDevicesQueryRepository } from './infrastructure/query/security-devices.query-repository.abstract';
import { SecurityDevicesMongoQueryRepository } from './infrastructure/query/security-devices.mongo-query-repository';
import { SecurityDevicesSqlQueryRepository } from './infrastructure/sql/query/security-devices.sql-query-repository';
import { AuthQueryRepository } from './infrastructure/query/auth.query-repository';
import { UsersExternalQueryRepository } from './infrastructure/external-query/users.external-query-repository';

import { AuthService } from './application/auth.service';
import { AuthTokensService } from './application/auth-tokens.service';
import { CryptoService } from './application/crypto.service';
import { UsersExternalService } from './application/users.external-service';
import { UserEmailNotifier } from './application/user-email-notifier.service';

import { CreateUserUseCase } from './application/usecases/create-user.usecase';
import { CreateConfirmedUserUseCase } from './application/usecases/create-confirmed-user.usecase';
import { UpdateUserUseCase } from './application/usecases/update-user.usecase';
import { DeleteUserUseCase } from './application/usecases/delete-user.usecase';
import { RegisterUserUseCase } from './application/usecases/register-user.usecase';
import { ConfirmRegistrationUseCase } from './application/usecases/confirm-registration.usecase';
import { ResendConfirmationEmailUseCase } from './application/usecases/resend-confirmation-email.usecase';
import { RecoverPasswordUseCase } from './application/usecases/recover-password.usecase';
import { SetNewPasswordUseCase } from './application/usecases/set-new-password.usecase';
import { LoginUserUseCase } from './application/usecases/login-user.usecase';
import { RefreshTokenUseCase } from './application/usecases/refresh-token.usecase';
import { LogoutUseCase } from './application/usecases/logout.usecase';
import { TerminateDeviceUseCase } from './application/usecases/terminate-device.usecase';
import { TerminateOtherDevicesUseCase } from './application/usecases/terminate-other-devices.usecase';

import { GetUsersQueryHandler } from './application/queries/get-users.query-handler';
import { GetUserByIdQueryHandler } from './application/queries/get-user-by-id.query-handler';
import { GetMeQueryHandler } from './application/queries/get-me.query-handler';
import { GetDevicesQueryHandler } from './application/queries/get-devices.query-handler';

import { LocalStrategy } from './guards/local/local.strategy';
import { JwtStrategy } from './guards/bearer/jwt.strategy';
import { RefreshTokenStrategy } from './guards/refresh/refresh-token.strategy';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  ACCESS_TOKEN_STRATEGY_INJECT_TOKEN,
  REFRESH_TOKEN_STRATEGY_INJECT_TOKEN,
} from './constants/auth-tokens.inject-constants';
import {
  ACCESS_TOKEN_EXPIRES_IN,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_SECRET,
} from './constants/auth.constants';

const commandHandlers = [
  CreateUserUseCase,
  CreateConfirmedUserUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  RegisterUserUseCase,
  ConfirmRegistrationUseCase,
  ResendConfirmationEmailUseCase,
  RecoverPasswordUseCase,
  SetNewPasswordUseCase,
  LoginUserUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
  TerminateDeviceUseCase,
  TerminateOtherDevicesUseCase,
];

const queryHandlers = [
  GetUsersQueryHandler,
  GetUserByIdQueryHandler,
  GetMeQueryHandler,
  GetDevicesQueryHandler,
];

/**
 * ВЫБОР ХРАНИЛИЩА — ЕДИНСТВЕННОЕ МЕСТО, КОТОРОЕ НАДО ТРОНУТЬ.
 *
 * Контроллеры, use case'ы, guards и view-DTO ниже по стеку не знают, какая
 * база под ними: они работают через абстрактные контракты репозиториев.
 * Переключается через USER_ACCOUNTS_DB=mongo|sql в .env (по умолчанию sql).
 *
 * Сравнить реализации: infrastructure/users.mongo-repository.ts
 *                  vs infrastructure/sql/users.sql-repository.ts
 */
const USE_SQL = (process.env.USER_ACCOUNTS_DB ?? 'sql') !== 'mongo';

const persistenceProviders = [
  {
    provide: UsersRepository,
    useClass: UsersSqlRepository,
  },
  {
    provide: SecurityDevicesRepository,
    useClass: USE_SQL
      ? SecurityDevicesSqlRepository
      : SecurityDevicesMongoRepository,
  },
  {
    provide: UsersQueryRepository,
    useClass: USE_SQL ? UsersSqlQueryRepository : UsersMongoQueryRepository,
  },
  {
    provide: SecurityDevicesQueryRepository,
    useClass: USE_SQL
      ? SecurityDevicesSqlQueryRepository
      : SecurityDevicesMongoQueryRepository,
  },
];

//access и refresh подписываются разными секретами с разным TTL, поэтому в IoC
//живут два отдельных экземпляра JwtService, инстанцированных через свои токены
const tokenStrategies = [
  {
    provide: ACCESS_TOKEN_STRATEGY_INJECT_TOKEN,
    useFactory: (): JwtService =>
      new JwtService({
        secret: ACCESS_TOKEN_SECRET,
        signOptions: { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
      }),
  },
  {
    provide: REFRESH_TOKEN_STRATEGY_INJECT_TOKEN,
    useFactory: (): JwtService =>
      new JwtService({
        secret: REFRESH_TOKEN_SECRET,
        signOptions: { expiresIn: REFRESH_TOKEN_EXPIRES_IN },
      }),
  },
];

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: DeviceSession.name, schema: DeviceSessionSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [UsersController, AuthController, SecurityDevicesController],
  providers: [
    ...persistenceProviders,
    AuthQueryRepository,
    UsersExternalQueryRepository,
    AuthService,
    AuthTokensService,
    CryptoService,
    UsersExternalService,
    UserEmailNotifier,
    LocalStrategy,
    JwtStrategy,
    RefreshTokenStrategy,
    ...tokenStrategies,
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [JwtStrategy, UsersExternalQueryRepository, UsersExternalService],
})
export class UserAccountsModule {}
