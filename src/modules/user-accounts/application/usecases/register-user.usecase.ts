import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { CreateUserDto } from '../../dto/create-user.dto';
import { UsersRepository } from '../../infrastructure/users.repository';
import { UserEmailNotifier } from '../user-email-notifier.service';
import { CreateUserCommand } from './create-user.usecase';
import { CONFIRMATION_CODE_TTL_MS } from '../../constants/auth.constants';

export class RegisterUserCommand {
  constructor(public dto: CreateUserDto) {}
}

@CommandHandler(RegisterUserCommand)
export class RegisterUserUseCase implements ICommandHandler<
  RegisterUserCommand,
  void
> {
  constructor(
    private commandBus: CommandBus,
    private usersRepository: UsersRepository,
    private emailNotifier: UserEmailNotifier,
  ) {}

  async execute({ dto }: RegisterUserCommand): Promise<void> {
    const createdUserId = await this.commandBus.execute<
      CreateUserCommand,
      Types.ObjectId
    >(new CreateUserCommand(dto));

    const confirmCode = randomUUID();

    const user = await this.usersRepository.findOrNotFoundFail(createdUserId);

    user.setConfirmationCode(
      confirmCode,
      new Date(Date.now() + CONFIRMATION_CODE_TTL_MS),
    );
    await this.usersRepository.save(user);

    await this.emailNotifier.sendConfirmation(user.email, confirmCode);
  }
}
