import { DeviceSession } from './modules/user-accounts/domain/device-session.entity';
import { IpRestriction } from './core/rate-limiting/ip-restriction.entity';
import { RateLimitingModule } from './core/rate-limiting/rate-limiting.module';
import { TypeOrmThrottlerStorage } from './core/rate-limiting/typeorm-throttler-storage';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserAccountsModule } from './modules/user-accounts/user-accounts.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { postgresOptions } from './core/database/postgres-options';
import { User } from './modules/user-accounts/domain/user.entity';
import { ThrottlerModule } from '@nestjs/throttler';
import { TestingModule } from './modules/testing/testing.module';
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
import { Blog } from './modules/bloggers-platform/blogs/domain/blog.entity';
import { Post } from './modules/bloggers-platform/posts/domain/post.entity';

@Module({
  imports: [
    //Postgres-пул для SQL-реализации user-accounts
    DatabaseModule,
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        ...postgresOptions(),
        entities: [User, DeviceSession, IpRestriction, Blog, Post],
        synchronize: false,
      }),
    }),
    //ip-restriction: ThrottlerModule глобальный, но ThrottlerGuard навешивается
    //точечно на auth-эндпоинты — остальное API не ограничиваем.
    //По умолчанию ВЫКЛЮЧЕН (требование этапа TypeORM blogs/posts):
    //включается только явным IP_RESTRICTION_ENABLED=true
    ThrottlerModule.forRootAsync({
      imports: [RateLimitingModule],
      inject: [TypeOrmThrottlerStorage],
      useFactory: (storage: TypeOrmThrottlerStorage) => ({
        storage,
        skipIf: () => process.env.IP_RESTRICTION_ENABLED !== 'true',
        throttlers: [
          {
            ttl: RATE_LIMIT_WINDOW_MS,
            limit: RATE_LIMIT_MAX,
            blockDuration: 0,
          },
        ],
      }),
    }),
    UserAccountsModule, //все модули должны быть заимпортированы в корневой модуль, либо напрямую, либо по цепочке (через другие модули)
    TestingModule,
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
