import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { UsersRepository } from '../../infrastructure/users.repository';
import { UserEmailNotifier } from '../user-email-notifier.service';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import { CONFIRMATION_CODE_TTL_MS } from '../../constants/auth.constants';

export class ResendConfirmationEmailCommand {
  constructor(public email: string) {}
}

@CommandHandler(ResendConfirmationEmailCommand)
export class ResendConfirmationEmailUseCase implements ICommandHandler<
  ResendConfirmationEmailCommand,
  void
> {
  constructor(
    private usersRepository: UsersRepository,
    private emailNotifier: UserEmailNotifier,
  ) {}

  async execute({ email }: ResendConfirmationEmailCommand): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);

    if (!user || user.emailConfirmation.isConfirmed) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Email is already confirmed or does not exist',
        extensions: [
          {
            message: 'Email is already confirmed or does not exist',
            key: 'email',
          },
        ],
      });
    }

    const confirmCode = randomUUID();
    user.setConfirmationCode(
      confirmCode,
      new Date(Date.now() + CONFIRMATION_CODE_TTL_MS),
    );
    await this.usersRepository.save(user);

    await this.emailNotifier.sendConfirmation(user.email, confirmCode);
  }
}
