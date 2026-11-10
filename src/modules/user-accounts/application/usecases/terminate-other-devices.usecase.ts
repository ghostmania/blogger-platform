import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SecurityDevicesTypeOrmRepository } from '../../infrastructure/typeorm/security-devices.typeorm-repository';

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
  constructor(
    private securityDevicesRepository: SecurityDevicesTypeOrmRepository,
  ) {}

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
