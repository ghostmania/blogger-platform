import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserContextDto } from '../../dto/user-context.dto';

export const ExtractUserFromRequest = createParamDecorator(
  (data: unknown, context: ExecutionContext): UserContextDto => {
    //user кладёт passport-стратегия; типизируем request, чтобы не тащить any
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: UserContextDto }>();

    const user = request.user;

    if (!user) {
      throw new Error('there is no user in the request object!');
    }

    return user;
  },
);
