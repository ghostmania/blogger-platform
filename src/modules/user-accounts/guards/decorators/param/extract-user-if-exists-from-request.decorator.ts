import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserContextDto } from '../../dto/user-context.dto';

export const ExtractUserIfExistsFromRequest = createParamDecorator(
  (data: unknown, context: ExecutionContext): UserContextDto | null => {
    //user кладёт passport-стратегия; типизируем request, чтобы не тащить any
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: UserContextDto }>();

    const user = request.user;

    if (!user) {
      return null;
    }

    return user;
  },
);
