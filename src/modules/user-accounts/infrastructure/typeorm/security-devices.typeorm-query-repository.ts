import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { DeviceSession } from '../../domain/device-session.entity';
import { DeviceViewDto } from '../../api/view-dto/devices.view-dto';
import { SecurityDevicesQueryRepository } from '../query/security-devices.query-repository.abstract';

@Injectable()
export class SecurityDevicesTypeOrmQueryRepository extends SecurityDevicesQueryRepository {
  constructor(
    @InjectRepository(DeviceSession)
    private readonly repository: Repository<DeviceSession>,
  ) {
    super();
  }
  async getActiveSessionsByUserId(userId: string): Promise<DeviceViewDto[]> {
    const sessions = await this.repository.find({
      where: { userId, expirationDate: MoreThan(new Date()) },
      order: { lastActiveDate: 'ASC', deviceId: 'ASC' },
    });
    return sessions.map(DeviceViewDto.mapToView);
  }
}
