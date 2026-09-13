import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SecurityDevicesRepository } from '../../infrastructure/security-devices.repository.abstract';

export class LogoutCommand {
  constructor(public deviceId: string) {}
}

@CommandHandler(LogoutCommand)
export class LogoutUseCase implements ICommandHandler<LogoutCommand, void> {
  constructor(private securityDevicesRepository: SecurityDevicesRepository) {}

  //удаление сессии отзывает refresh-токен устройства: предъявить его повторно нельзя
  async execute({ deviceId }: LogoutCommand): Promise<void> {
    await this.securityDevicesRepository.deleteByDeviceId(deviceId);
  }
}
