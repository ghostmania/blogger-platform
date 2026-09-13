import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SecurityDevicesRepository } from '../../infrastructure/security-devices.repository.abstract';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

export class TerminateDeviceCommand {
  constructor(
    public userId: string,
    public deviceId: string,
  ) {}
}

@CommandHandler(TerminateDeviceCommand)
export class TerminateDeviceUseCase implements ICommandHandler<
  TerminateDeviceCommand,
  void
> {
  constructor(private securityDevicesRepository: SecurityDevicesRepository) {}

  async execute({ userId, deviceId }: TerminateDeviceCommand): Promise<void> {
    //по спеке порядок важен: несуществующее устройство — 404, чужое — 403
    const session =
      await this.securityDevicesRepository.findOrNotFoundFail(deviceId);

    if (session.userId !== userId) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'Device session belongs to another user',
      });
    }

    await this.securityDevicesRepository.deleteByDeviceId(deviceId);
  }
}
