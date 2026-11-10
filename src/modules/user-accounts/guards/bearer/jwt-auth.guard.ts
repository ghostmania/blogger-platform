import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import { UserContextDto } from '../dto/user-context.dto';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  //passport отдаёт user как false при невалидном токене
  handleRequest<TUser = UserContextDto>(
    err: unknown,
    user: UserContextDto | false | null,
  ): TUser {
    if (err || !user) {
      // здесь можно выбросить любую свою ошибку
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Unauthorized',
      });
    }
    return user as TUser;
  }
}
