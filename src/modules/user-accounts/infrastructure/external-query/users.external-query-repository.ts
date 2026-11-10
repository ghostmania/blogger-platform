import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersTypeOrmRepository } from '../typeorm/users.typeorm-repository';
import { UserExternalDto } from './external-dto/users.external-dto';

//как и AuthQueryRepository, читает через UsersTypeOrmRepository и только собирает внешний dto
@Injectable()
export class UsersExternalQueryRepository {
  constructor(private usersRepository: UsersTypeOrmRepository) {}

  async getByIdOrNotFoundFail(id: string): Promise<UserExternalDto> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('user not found');
    }

    return UserExternalDto.mapToView(user);
  }
}
