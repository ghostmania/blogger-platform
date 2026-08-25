import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  DeviceSession,
  DeviceSessionModelType,
} from '../../domain/device-session.entity';
import { DeviceViewDto } from '../../api/view-dto/devices.view-dto';

@Injectable()
export class SecurityDevicesQueryRepository {
  constructor(
    @InjectModel(DeviceSession.name)
    private DeviceSessionModel: DeviceSessionModelType,
  ) {}

  async getActiveSessionsByUserId(userId: string): Promise<DeviceViewDto[]> {
    const sessions = await this.DeviceSessionModel.find({ userId }).sort({
      lastActiveDate: 1,
    });

    return sessions.map(DeviceViewDto.mapToView);
  }
}
