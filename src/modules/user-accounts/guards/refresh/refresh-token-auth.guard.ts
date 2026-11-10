import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { REFRESH_TOKEN_STRATEGY_NAME } from './refresh-token.strategy';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import { RefreshTokenContextDto } from '../dto/refresh-token-context.dto';

@Injectable()
export class RefreshTokenAuthGuard extends AuthGuard(
  REFRESH_TOKEN_STRATEGY_NAME,
) {
  handleRequest<TUser = RefreshTokenContextDto>(
    err: unknown,
    user: RefreshTokenContextDto | false | null,
  ): TUser {
    //DomainException из strategy.validate уже несёт нужный код — пробрасываем как есть
    if (err instanceof DomainException) {
      throw err;
    }

    //сюда попадаем, если cookie нет вовсе, подпись битая или токен протух
    if (err || !user) {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Unauthorized',
      });
    }

    return user as TUser;
  }
}
