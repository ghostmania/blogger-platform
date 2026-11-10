import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { DeviceSession } from '../../domain/device-session.entity';
import { DeviceViewDto } from '../../api/view-dto/devices.view-dto';

@Injectable()
export class SecurityDevicesTypeOrmQueryRepository {
  constructor(
    @InjectRepository(DeviceSession)
    private readonly repository: Repository<DeviceSession>,
  ) {}
  async getActiveSessionsByUserId(userId: string): Promise<DeviceViewDto[]> {
    const sessions = await this.repository.find({
      where: { userId, expirationDate: MoreThan(new Date()) },
      order: { lastActiveDate: 'ASC', deviceId: 'ASC' },
    });
    return sessions.map(DeviceViewDto.mapToView);
  }
}
