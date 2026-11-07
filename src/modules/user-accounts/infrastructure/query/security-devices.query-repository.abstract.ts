import { DeviceViewDto } from '../../api/view-dto/devices.view-dto';

//Контракт чтения активных сессий.
export abstract class SecurityDevicesQueryRepository {
  abstract getActiveSessionsByUserId(userId: string): Promise<DeviceViewDto[]>;
}
