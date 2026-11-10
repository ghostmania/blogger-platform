import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersTypeOrmRepository } from '../../infrastructure/typeorm/users.typeorm-repository';

export class DeleteUserCommand {
  constructor(public id: string) {}
}

@CommandHandler(DeleteUserCommand)
export class DeleteUserUseCase implements ICommandHandler<
  DeleteUserCommand,
  void
> {
  constructor(private usersRepository: UsersTypeOrmRepository) {}

  async execute({ id }: DeleteUserCommand): Promise<void> {
    const user = await this.usersRepository.findOrNotFoundFail(id);

    user.makeDeleted();

    await this.usersRepository.deleteById(id);
  }
}
