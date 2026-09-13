import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../../core/database/database.constants';
import {
  DeviceSessionSqlEntity,
  DeviceSessionRow,
} from '../../domain/sql/device-session.sql-entity';
import { CreateDeviceSessionDomainDto } from '../../domain/dto/create-device-session.domain.dto';
import { SecurityDevicesRepository } from '../security-devices.repository.abstract';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

const SESSION_COLUMNS = `
  device_id, user_id, ip, title,
  last_active_date, expiration_date,
  created_at, updated_at
`;

//PostgreSQL-реализация контракта SecurityDevicesRepository
@Injectable()
export class SecurityDevicesSqlRepository extends SecurityDevicesRepository {
  constructor(@Inject(PG_POOL) private pool: Pool) {
    super();
  }

  createInstance(dto: CreateDeviceSessionDomainDto): DeviceSessionSqlEntity {
    return DeviceSessionSqlEntity.createInstance(dto);
  }

  /**
   * deviceId генерируется в use case, а не базой, поэтому отличить создание
   * от обновления по «пустому id» нельзя — используем upsert.
   * Логин создаёт строку, refresh обновляет её же.
   */
  async save(session: DeviceSessionSqlEntity): Promise<void> {
    await this.pool.query(
      `INSERT INTO device_sessions (
         device_id, user_id, ip, title, last_active_date, expiration_date
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (device_id) DO UPDATE
       SET ip = EXCLUDED.ip,
           title = EXCLUDED.title,
           last_active_date = EXCLUDED.last_active_date,
           expiration_date = EXCLUDED.expiration_date,
           updated_at = now()`,
      [
        session.deviceId,
        session.userId,
        session.ip,
        session.title,
        session.lastActiveDate,
        session.expirationDate,
      ],
    );
  }

  async findByDeviceId(
    deviceId: string,
  ): Promise<DeviceSessionSqlEntity | null> {
    //device_id — колонка uuid; произвольная строка из URL уронила бы запрос
    //ошибкой 22P02, поэтому формат проверяем заранее
    if (!UUID_PATTERN.test(deviceId)) {
      return null;
    }

    const { rows } = await this.pool.query<DeviceSessionRow>(
      `SELECT ${SESSION_COLUMNS} FROM device_sessions WHERE device_id = $1`,
      [deviceId],
    );

    return rows.length ? DeviceSessionSqlEntity.fromRow(rows[0]) : null;
  }

  async findOrNotFoundFail(deviceId: string): Promise<DeviceSessionSqlEntity> {
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
    if (!UUID_PATTERN.test(deviceId)) {
      return;
    }

    await this.pool.query(`DELETE FROM device_sessions WHERE device_id = $1`, [
      deviceId,
    ]);
  }

  //logout со всех устройств, кроме текущего (DELETE /security/devices)
  async deleteAllOtherByUserId(
    userId: string,
    currentDeviceId: string,
  ): Promise<void> {
    await this.pool.query(
      `DELETE FROM device_sessions
       WHERE user_id = $1 AND device_id <> $2`,
      [userId, currentDeviceId],
    );
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
