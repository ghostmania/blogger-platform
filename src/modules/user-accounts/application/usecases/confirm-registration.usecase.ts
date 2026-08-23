import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersRepository } from '../../infrastructure/users.repository';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

export class ConfirmRegistrationCommand {
  constructor(public code: string) {}
}

@CommandHandler(ConfirmRegistrationCommand)
export class ConfirmRegistrationUseCase implements ICommandHandler<
  ConfirmRegistrationCommand,
  void
> {
  constructor(private usersRepository: UsersRepository) {}

  async execute({ code }: ConfirmRegistrationCommand): Promise<void> {
    const user = await this.usersRepository.findByConfirmationCode(code);

    if (!user || user.emailConfirmation.isConfirmed) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Confirmation code is incorrect',
        extensions: [
          { message: 'Confirmation code is incorrect', key: 'code' },
        ],
      });
    }

    if (
      !user.emailConfirmation.expirationDate ||
      user.emailConfirmation.expirationDate < new Date()
    ) {
      throw new DomainException({
        code: DomainExceptionCode.ConfirmationCodeExpired,
        message: 'Confirmation code is expired',
        extensions: [{ message: 'Confirmation code is expired', key: 'code' }],
      });
    }

    user.confirmEmail();
    await this.usersRepository.save(user);
  }
}
