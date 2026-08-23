import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersRepository } from '../../infrastructure/users.repository';
import { CryptoService } from '../crypto.service';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

export class SetNewPasswordCommand {
  constructor(
    public newPassword: string,
    public recoveryCode: string,
  ) {}
}

@CommandHandler(SetNewPasswordCommand)
export class SetNewPasswordUseCase implements ICommandHandler<
  SetNewPasswordCommand,
  void
> {
  constructor(
    private usersRepository: UsersRepository,
    private cryptoService: CryptoService,
  ) {}

  async execute({
    newPassword,
    recoveryCode,
  }: SetNewPasswordCommand): Promise<void> {
    const user =
      await this.usersRepository.findByPasswordRecoveryCode(recoveryCode);

    if (!user) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Recovery code is incorrect',
        extensions: [
          { message: 'Recovery code is incorrect', key: 'recoveryCode' },
        ],
      });
    }

    if (
      !user.passwordRecovery.expirationDate ||
      user.passwordRecovery.expirationDate < new Date()
    ) {
      throw new DomainException({
        code: DomainExceptionCode.PasswordRecoveryCodeExpired,
        message: 'Recovery code is expired',
        extensions: [
          { message: 'Recovery code is expired', key: 'recoveryCode' },
        ],
      });
    }

    const passwordHash =
      await this.cryptoService.createPasswordHash(newPassword);
    user.updatePassword(passwordHash);

    await this.usersRepository.save(user);
  }
}
