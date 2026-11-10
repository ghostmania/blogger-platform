import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserContextDto } from '../dto/user-context.dto';

//в домашнем задании есть случай когда надо проверить токен и извлечь данные из токена, но не блокировать запрос для анонимного пользователя
//для этого можно использовать подобный гард, переопределив handleRequest
//https://docs.nestjs.com/recipes/passport#extending-guards
@Injectable()
export class JwtOptionalAuthGuard extends AuthGuard('jwt') {
  //в отличие от базового handleRequest не кидаем ошибку для анонимного юзера,
  //а просто возвращаем null
  handleRequest<TUser = UserContextDto | null>(
    err: unknown,
    user: UserContextDto | false | null,
  ): TUser {
    if (err || !user) {
      return null as TUser;
    }
    return user as TUser;
  }
}
