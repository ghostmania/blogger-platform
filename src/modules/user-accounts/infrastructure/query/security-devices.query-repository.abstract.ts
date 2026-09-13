import { DeviceViewDto } from '../../api/view-dto/devices.view-dto';

//контракт read-модели активных сессий; реализации — Mongo и SQL
export abstract class SecurityDevicesQueryRepository {
  abstract getActiveSessionsByUserId(userId: string): Promise<DeviceViewDto[]>;
}
