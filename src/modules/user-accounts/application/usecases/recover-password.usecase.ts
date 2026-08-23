import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { UsersRepository } from '../../infrastructure/users.repository';
import { UserEmailNotifier } from '../user-email-notifier.service';
import { RECOVERY_CODE_TTL_MS } from '../../constants/auth.constants';

export class RecoverPasswordCommand {
  constructor(public email: string) {}
}

@CommandHandler(RecoverPasswordCommand)
export class RecoverPasswordUseCase implements ICommandHandler<
  RecoverPasswordCommand,
  void
> {
  constructor(
    private usersRepository: UsersRepository,
    private emailNotifier: UserEmailNotifier,
  ) {}

  async execute({ email }: RecoverPasswordCommand): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      //даже для незарегистрированного email отвечаем 204,
      //чтобы нельзя было перебором выяснить, какие email есть в системе
      return;
    }

    const recoveryCode = randomUUID();
    user.setPasswordRecoveryCode(
      recoveryCode,
      new Date(Date.now() + RECOVERY_CODE_TTL_MS),
    );
    await this.usersRepository.save(user);

    await this.emailNotifier.sendPasswordRecovery(user.email, recoveryCode);
  }
}
