import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateUserDto } from '../../dto/create-user.dto';
import { UsersRepository } from '../../infrastructure/users.repository.abstract';

export class UpdateUserCommand {
  constructor(
    public id: string,
    public dto: UpdateUserDto,
  ) {}
}

@CommandHandler(UpdateUserCommand)
export class UpdateUserUseCase implements ICommandHandler<
  UpdateUserCommand,
  string
> {
  constructor(private usersRepository: UsersRepository) {}

  async execute({ id, dto }: UpdateUserCommand): Promise<string> {
    const user = await this.usersRepository.findOrNotFoundFail(id);

    // не присваиваем св-ва сущностям напрямую! даже для изменения одного св-ва создаём метод
    user.update(dto); // change detection

    await this.usersRepository.save(user);

    return user.id;
  }
}
