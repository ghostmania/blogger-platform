import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SecurityDevicesTypeOrmRepository } from '../../infrastructure/typeorm/security-devices.typeorm-repository';

export class LogoutCommand {
  constructor(public deviceId: string) {}
}

@CommandHandler(LogoutCommand)
export class LogoutUseCase implements ICommandHandler<LogoutCommand, void> {
  constructor(
    private securityDevicesRepository: SecurityDevicesTypeOrmRepository,
  ) {}

  //удаление сессии отзывает refresh-токен устройства: предъявить его повторно нельзя
  async execute({ deviceId }: LogoutCommand): Promise<void> {
    await this.securityDevicesRepository.deleteByDeviceId(deviceId);
  }
}
