import { Injectable } from '@nestjs/common';
import { MeViewDto } from '../../api/view-dto/users.view-dto';
import { UsersTypeOrmRepository } from '../typeorm/users.typeorm-repository';

/**
 * Этот репозиторий НЕ дублируется под SQL: он работает через контракт
 * UsersTypeOrmRepository и не знает, какая база под ним. Наглядный пример того,
 * что при смене хранилища переписывать приходится далеко не всё.
 */
@Injectable()
export class AuthQueryRepository {
  constructor(private usersRepository: UsersTypeOrmRepository) {}

  async me(userId: string): Promise<MeViewDto> {
    const user = await this.usersRepository.findOrNotFoundFail(userId);

    return MeViewDto.mapToView(user);
  }
}
