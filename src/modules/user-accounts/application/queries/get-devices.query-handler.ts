import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SecurityDevicesQueryRepository } from '../../infrastructure/query/security-devices.query-repository';
import { DeviceViewDto } from '../../api/view-dto/devices.view-dto';

export class GetDevicesQuery {
  constructor(public userId: string) {}
}

@QueryHandler(GetDevicesQuery)
export class GetDevicesQueryHandler implements IQueryHandler<
  GetDevicesQuery,
  DeviceViewDto[]
> {
  constructor(
    private securityDevicesQueryRepository: SecurityDevicesQueryRepository,
  ) {}

  execute({ userId }: GetDevicesQuery): Promise<DeviceViewDto[]> {
    return this.securityDevicesQueryRepository.getActiveSessionsByUserId(
      userId,
    );
  }
}
