import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { RefreshTokenContextDto } from '../../dto/refresh-token-context.dto';

//достаёт из запроса пользователя вместе с deviceId (кладёт RefreshTokenStrategy)
export const ExtractSessionFromRequest = createParamDecorator(
  (data: unknown, context: ExecutionContext): RefreshTokenContextDto => {
    //user кладёт passport-стратегия; типизируем request, чтобы не тащить any
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RefreshTokenContextDto }>();

    const user = request.user;

    if (!user) {
      throw new Error('there is no user in the request object!');
    }

    return user;
  },
);
