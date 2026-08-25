import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiCookieAuth } from '@nestjs/swagger';
import { RefreshTokenAuthGuard } from '../guards/refresh/refresh-token-auth.guard';
import { ExtractSessionFromRequest } from '../guards/decorators/param/extract-session-from-request.decorator';
import { RefreshTokenContextDto } from '../guards/dto/refresh-token-context.dto';
import { DeviceViewDto } from './view-dto/devices.view-dto';
import { GetDevicesQuery } from '../application/queries/get-devices.query-handler';
import { TerminateDeviceCommand } from '../application/usecases/terminate-device.usecase';
import { TerminateOtherDevicesCommand } from '../application/usecases/terminate-other-devices.usecase';

//по swagger-спеке путь именно /security/devices
@ApiCookieAuth()
@Controller('security/devices')
//все три ручки авторизуются refresh-токеном из cookie, а не access-токеном:
//иначе нельзя было бы понять, какое устройство «текущее»
@UseGuards(RefreshTokenAuthGuard)
export class SecurityDevicesController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get()
  getDevices(
    @ExtractSessionFromRequest() session: RefreshTokenContextDto,
  ): Promise<DeviceViewDto[]> {
    return this.queryBus.execute(new GetDevicesQuery(session.id));
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  terminateOtherDevices(
    @ExtractSessionFromRequest() session: RefreshTokenContextDto,
  ): Promise<void> {
    return this.commandBus.execute(
      new TerminateOtherDevicesCommand(session.id, session.deviceId),
    );
  }

  @Delete(':deviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  terminateDevice(
    @ExtractSessionFromRequest() session: RefreshTokenContextDto,
    @Param('deviceId') deviceId: string,
  ): Promise<void> {
    return this.commandBus.execute(
      new TerminateDeviceCommand(session.id, deviceId),
    );
  }
}
