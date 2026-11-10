import { Injectable } from '@nestjs/common';
import { MeViewDto } from '../../api/view-dto/users.view-dto';
import { UsersTypeOrmRepository } from '../typeorm/users.typeorm-repository';

/**
 * Не ходит в базу сам: читает пользователя через UsersTypeOrmRepository
 * и только собирает view для /auth/me.
 */
@Injectable()
export class AuthQueryRepository {
  constructor(private usersRepository: UsersTypeOrmRepository) {}

  async me(userId: string): Promise<MeViewDto> {
    const user = await this.usersRepository.findOrNotFoundFail(userId);

    return MeViewDto.mapToView(user);
  }
}
