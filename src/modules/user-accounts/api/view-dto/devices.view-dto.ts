import { ApiProperty } from '@nestjs/swagger';
import { DeviceSessionEntity } from '../../domain/entity.contracts';

//формат ответа GET /security/devices по swagger-спеке
export class DeviceViewDto {
  @ApiProperty({ description: 'IP address of device during signing in' })
  ip: string;

  @ApiProperty({ description: 'Device name (browser/user-agent)' })
  title: string;

  @ApiProperty({ description: 'Date of the last generating of refresh token' })
  lastActiveDate: string;

  @ApiProperty({ description: 'Id of connected device session' })
  deviceId: string;

  static mapToView(session: DeviceSessionEntity): DeviceViewDto {
    const dto = new DeviceViewDto();

    dto.ip = session.ip;
    dto.title = session.title;
    dto.lastActiveDate = session.lastActiveDate.toISOString();
    dto.deviceId = session.deviceId;

    return dto;
  }
}
