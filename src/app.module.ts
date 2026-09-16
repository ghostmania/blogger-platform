import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserAccountsModule } from './modules/user-accounts/user-accounts.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { TestingModule } from './modules/testing/testing.module';
// import { BloggersPlatformModule } from './modules/bloggers-platform/bloggers-platform.module';
import { CoreModule } from './core/core.module';
import { DatabaseModule } from './core/database/database.module';
import { APP_FILTER } from '@nestjs/core';
import { AllHttpExceptionsFilter } from './core/exceptions/filters/all-exceptions.filter';
import { DomainHttpExceptionsFilter } from './core/exceptions/filters/domain-exceptions.filter';
import {
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
} from './modules/user-accounts/constants/auth.constants';
import { SadminModule } from './modules/super-admin/sadmin.module';
import { BloggersPlatformModule } from './modules/bloggers-platform/bloggers-platform.module';

@Module({
  imports: [
    //Postgres-пул для SQL-реализации user-accounts
    DatabaseModule,
    MongooseModule.forRoot(
      process.env.MONGO_URI ?? 'mongodb://localhost/nest-bloggers-platform',
    ), //локально дефолт, на проде — MONGO_URI из окружения (напр. MongoDB Atlas)
    //ip-restriction: ThrottlerModule глобальный, но ThrottlerGuard навешивается
    //точечно на auth-эндпоинты — остальное API не ограничиваем
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: RATE_LIMIT_WINDOW_MS, limit: RATE_LIMIT_MAX }],
    }),
    UserAccountsModule, //все модули должны быть заимпортированы в корневой модуль, либо напрямую, либо по цепочке (через другие модули)
    TestingModule,
    //ОТКЛЮЧЁН НА ВРЕМЯ ПЕРЕВОДА НА SQL.
    //Роуты /blogs, /posts, /comments не поднимаются; код модуля не тронут —
    //чтобы вернуть, достаточно раскомментировать эту строку и импорт выше.
    //Сейчас на SQL работают только /auth/*, /security/devices, /users, /testing.
    BloggersPlatformModule,
    CoreModule,
    SadminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    //регистрация глобальных exception filters
    //важен порядок регистрации! Первым сработает DomainHttpExceptionsFilter!
    {
      provide: APP_FILTER,
      useClass: AllHttpExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: DomainHttpExceptionsFilter,
    },
  ],
})
export class AppModule {}
