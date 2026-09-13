import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  DeviceSession,
  DeviceSessionModelType,
} from '../../domain/device-session.entity';
import { DeviceViewDto } from '../../api/view-dto/devices.view-dto';
import { SecurityDevicesQueryRepository } from './security-devices.query-repository.abstract';

@Injectable()
//MongoDB-реализация. Протухшие сессии здесь подчищает TTL-индекс схемы,
//поэтому фильтра по expirationDate нет — в SQL-версии он появится явно
export class SecurityDevicesMongoQueryRepository extends SecurityDevicesQueryRepository {
  constructor(
    @InjectModel(DeviceSession.name)
    private DeviceSessionModel: DeviceSessionModelType,
  ) {
    super();
  }

  async getActiveSessionsByUserId(userId: string): Promise<DeviceViewDto[]> {
    const sessions = await this.DeviceSessionModel.find({ userId }).sort({
      lastActiveDate: 1,
    });

    return sessions.map(DeviceViewDto.mapToView);
  }
}
