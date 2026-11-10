import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../../authenticated-request.type';
import { UserContextDto } from '../../dto/user-context.dto';

export const ExtractUserIfExistsFromRequest = createParamDecorator(
  (data: unknown, context: ExecutionContext): UserContextDto | null => {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest<UserContextDto>>();

    const user = request.user;

    if (!user) {
      return null;
    }

    return user;
  },
);
