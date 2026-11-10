import { Injectable } from '@nestjs/common';
import { UsersTypeOrmRepository } from '../infrastructure/typeorm/users.typeorm-repository';

@Injectable()
export class UsersExternalService {
  constructor(private usersRepository: UsersTypeOrmRepository) {}

  async makeUserAsSpammer(userId: string) {
    const user = await this.usersRepository.findOrNotFoundFail(userId);

    // user.makeSpammer();

    await this.usersRepository.save(user);
  }
}
