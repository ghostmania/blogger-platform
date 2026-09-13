import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  DeviceSession,
  DeviceSessionDocument,
  DeviceSessionModelType,
} from '../domain/device-session.entity';
import { CreateDeviceSessionDomainDto } from '../domain/dto/create-device-session.domain.dto';
import { SecurityDevicesRepository } from './security-devices.repository.abstract';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';

//MongoDB-реализация контракта SecurityDevicesRepository
@Injectable()
export class SecurityDevicesMongoRepository extends SecurityDevicesRepository {
  constructor(
    @InjectModel(DeviceSession.name)
    private DeviceSessionModel: DeviceSessionModelType,
  ) {
    super();
  }

  createInstance(dto: CreateDeviceSessionDomainDto): DeviceSessionDocument {
    return this.DeviceSessionModel.createInstance(dto);
  }

  async save(session: DeviceSessionDocument): Promise<void> {
    await session.save();
  }

  findByDeviceId(deviceId: string): Promise<DeviceSessionDocument | null> {
    return this.DeviceSessionModel.findOne({ deviceId });
  }

  async findOrNotFoundFail(deviceId: string): Promise<DeviceSessionDocument> {
    const session = await this.findByDeviceId(deviceId);

    if (!session) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Device session not found',
      });
    }

    return session;
  }

  async deleteByDeviceId(deviceId: string): Promise<void> {
    await this.DeviceSessionModel.deleteOne({ deviceId });
  }

  //logout со всех устройств, кроме текущего (DELETE /security/devices)
  async deleteAllOtherByUserId(
    userId: string,
    currentDeviceId: string,
  ): Promise<void> {
    await this.DeviceSessionModel.deleteMany({
      userId,
      deviceId: { $ne: currentDeviceId },
    });
  }
}
