import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  DomainException,
  Extension,
} from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import { UserContextDto } from '../dto/user-context.dto';

//этот гард вешаем на логин. Через локальную стратегию проверяются логин и пароль пользователя
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  //гарды отрабатывают ДО пайпов, поэтому боди логина не проходит через ValidationPipe.
  //passport-local сам отбивает запрос с пустыми полями, а базовый handleRequest отдал бы 401 —
  //по swagger-спеке на некорректный inputModel нужен 400
  handleRequest<TUser = UserContextDto>(
    err: unknown,
    user: UserContextDto | false | null,
    info: unknown,
  ): TUser {
    if (err) {
      //DomainException, бросенный из LocalStrategy.validate
      throw err instanceof Error ? err : new Error('Authentication failed');
    }

    if (user) {
      return user as TUser;
    }

    //passport-local кладёт причину отказа в info.message
    const reason = (info as { message?: string } | undefined)?.message;
    if (reason === 'Missing credentials') {
      throw new DomainException({
        code: DomainExceptionCode.ValidationError,
        message: 'Validation failed',
        extensions: [
          new Extension(
            'loginOrEmail and password are required',
            'loginOrEmail',
          ),
        ],
      });
    }

    throw new DomainException({
      code: DomainExceptionCode.Unauthorized,
      message: 'Unauthorized',
    });
  }
}
