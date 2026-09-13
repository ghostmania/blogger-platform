import { DeviceSessionEntity } from '../domain/entity.contracts';
import { CreateDeviceSessionDomainDto } from '../domain/dto/create-device-session.domain.dto';

//см. комментарий в users.repository.abstract.ts — тот же приём с DI-токеном
export abstract class SecurityDevicesRepository {
  abstract createInstance(
    dto: CreateDeviceSessionDomainDto,
  ): DeviceSessionEntity;

  abstract save(session: DeviceSessionEntity): Promise<void>;

  abstract findByDeviceId(deviceId: string): Promise<DeviceSessionEntity | null>;

  abstract findOrNotFoundFail(deviceId: string): Promise<DeviceSessionEntity>;

  abstract deleteByDeviceId(deviceId: string): Promise<void>;

  //logout со всех устройств, кроме текущего (DELETE /security/devices)
  abstract deleteAllOtherByUserId(
    userId: string,
    currentDeviceId: string,
  ): Promise<void>;
}
