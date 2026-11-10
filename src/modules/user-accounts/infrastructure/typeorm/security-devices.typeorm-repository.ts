import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { DeviceSession } from '../../domain/device-session.entity';
import { CreateDeviceSessionDomainDto } from '../../domain/dto/create-device-session.domain.dto';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class SecurityDevicesTypeOrmRepository {
  constructor(
    @InjectRepository(DeviceSession)
    private readonly repository: Repository<DeviceSession>,
  ) {}
  createInstance(dto: CreateDeviceSessionDomainDto): DeviceSession {
    return DeviceSession.createInstance(dto);
  }
  async save(session: DeviceSession): Promise<void> {
    await this.repository.save(session);
  }
  async rotate(
    session: DeviceSession,
    previousLastActiveDate: Date,
  ): Promise<boolean> {
    const result = await this.repository.update(
      {
        deviceId: session.deviceId,
        userId: session.userId,
        lastActiveDate: previousLastActiveDate,
      },
      {
        lastActiveDate: session.lastActiveDate,
        expirationDate: session.expirationDate,
        ip: session.ip,
      },
    );
    return result.affected === 1;
  }
  findByDeviceId(deviceId: string): Promise<DeviceSession | null> {
    return UUID_PATTERN.test(deviceId)
      ? this.repository.findOneBy({ deviceId })
      : Promise.resolve(null);
  }
  async findOrNotFoundFail(deviceId: string): Promise<DeviceSession> {
    const session = await this.findByDeviceId(deviceId);
    if (!session)
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Device session not found',
      });
    return session;
  }
  async deleteByDeviceId(deviceId: string): Promise<void> {
    if (UUID_PATTERN.test(deviceId)) await this.repository.delete({ deviceId });
  }
  async deleteAllOtherByUserId(
    userId: string,
    currentDeviceId: string,
  ): Promise<void> {
    await this.repository.delete({ userId, deviceId: Not(currentDeviceId) });
  }
}
