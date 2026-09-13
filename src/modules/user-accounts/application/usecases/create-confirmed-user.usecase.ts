import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateUserDto } from '../../dto/create-user.dto';
import { UsersRepository } from '../../infrastructure/users.repository.abstract';
import { CreateUserCommand } from './create-user.usecase';

export class CreateConfirmedUserCommand {
  constructor(public dto: CreateUserDto) {}
}

//создание юзера суперадмином: подтверждение email не требуется
@CommandHandler(CreateConfirmedUserCommand)
export class CreateConfirmedUserUseCase implements ICommandHandler<
  CreateConfirmedUserCommand,
  string
> {
  constructor(
    private commandBus: CommandBus,
    private usersRepository: UsersRepository,
  ) {}

  async execute({ dto }: CreateConfirmedUserCommand): Promise<string> {
    const userId = await this.commandBus.execute<
      CreateUserCommand,
      string
    >(new CreateUserCommand(dto));

    const user = await this.usersRepository.findOrNotFoundFail(userId);

    user.confirmEmail();
    await this.usersRepository.save(user);

    return userId;
  }
}
