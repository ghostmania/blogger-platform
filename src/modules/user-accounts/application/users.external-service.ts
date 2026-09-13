import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../infrastructure/users.repository.abstract';

@Injectable()
export class UsersExternalService {
  constructor(private usersRepository: UsersRepository) {}

  async makeUserAsSpammer(userId: string) {
    const user = await this.usersRepository.findOrNotFoundFail(userId);

    // user.makeSpammer();

    await this.usersRepository.save(user);
  }
}
