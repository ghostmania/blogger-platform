import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  DeviceSession,
  DeviceSessionDocument,
  DeviceSessionModelType,
} from '../domain/device-session.entity';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';

@Injectable()
export class SecurityDevicesRepository {
  constructor(
    @InjectModel(DeviceSession.name)
    private DeviceSessionModel: DeviceSessionModelType,
  ) {}

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
