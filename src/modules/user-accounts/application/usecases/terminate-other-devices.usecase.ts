import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SecurityDevicesRepository } from '../../infrastructure/security-devices.repository';

export class TerminateOtherDevicesCommand {
  constructor(
    public userId: string,
    public currentDeviceId: string,
  ) {}
}

@CommandHandler(TerminateOtherDevicesCommand)
export class TerminateOtherDevicesUseCase implements ICommandHandler<
  TerminateOtherDevicesCommand,
  void
> {
  constructor(private securityDevicesRepository: SecurityDevicesRepository) {}

  async execute({
    userId,
    currentDeviceId,
  }: TerminateOtherDevicesCommand): Promise<void> {
    await this.securityDevicesRepository.deleteAllOtherByUserId(
      userId,
      currentDeviceId,
    );
  }
}
