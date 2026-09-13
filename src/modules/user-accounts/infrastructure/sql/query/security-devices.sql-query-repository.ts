import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../../../core/database/database.constants';
import {
  DeviceSessionSqlEntity,
  DeviceSessionRow,
} from '../../../domain/sql/device-session.sql-entity';
import { DeviceViewDto } from '../../../api/view-dto/devices.view-dto';
import { SecurityDevicesQueryRepository } from '../../query/security-devices.query-repository.abstract';

@Injectable()
export class SecurityDevicesSqlQueryRepository extends SecurityDevicesQueryRepository {
  constructor(@Inject(PG_POOL) private pool: Pool) {
    super();
  }

  async getActiveSessionsByUserId(userId: string): Promise<DeviceViewDto[]> {
    //в монго протухшие сессии убирал TTL-индекс; в Postgres автоудаления
    //по времени нет, поэтому отсекаем их прямо в выборке
    const { rows } = await this.pool.query<DeviceSessionRow>(
      `SELECT device_id, user_id, ip, title,
              last_active_date, expiration_date,
              created_at, updated_at
       FROM device_sessions
       WHERE user_id = $1 AND expiration_date > now()
       ORDER BY last_active_date ASC`,
      [userId],
    );

    return rows.map((row) =>
      DeviceViewDto.mapToView(DeviceSessionSqlEntity.fromRow(row)),
    );
  }
}
