import { CreateDeviceSessionDomainDto } from '../dto/create-device-session.domain.dto';

/**
 * SQL-версия сессии устройства (см. domain/device-session.entity.ts).
 *
 * Важное отличие от монго: там протухшие сессии подчищал TTL-индекс
 * ({ expirationDate: 1 }, { expireAfterSeconds: 0 }). В Postgres автоудаления
 * по времени нет, поэтому протухшие строки отсекаются прямо в выборке
 * (WHERE expiration_date > now()) — см. security-devices.sql-query-repository.
 */

//строка таблицы device_sessions; user_id — bigint, драйвер отдаёт его строкой
export type DeviceSessionRow = {
  device_id: string;
  user_id: string;
  ip: string;
  title: string;
  last_active_date: Date;
  expiration_date: Date;
  created_at: Date;
  updated_at: Date;
};

export class DeviceSessionSqlEntity {
  userId: string;
  //живёт внутри refresh-токена и не меняется при рефреше; он же PRIMARY KEY
  deviceId: string;
  ip: string;
  //название устройства — берём из заголовка User-Agent
  title: string;
  /**
   * Дата выпуска ТЕКУЩЕГО refresh-токена. Играет роль версии сессии: токен со
   * «старой» датой считается отозванным, поэтому один refresh-токен нельзя
   * использовать дважды.
   */
  lastActiveDate: Date;
  //срок жизни текущего refresh-токена (exp из payload)
  expirationDate: Date;
  createdAt: Date;
  updatedAt: Date;

  //сессия создаётся только вместе с уже выпущенным refresh-токеном
  static createInstance(
    dto: CreateDeviceSessionDomainDto,
  ): DeviceSessionSqlEntity {
    const session = new this();

    session.userId = dto.userId;
    session.deviceId = dto.deviceId;
    session.ip = dto.ip;
    session.title = dto.title;
    session.lastActiveDate = dto.lastActiveDate;
    session.expirationDate = dto.expirationDate;

    return session;
  }

  static fromRow(row: DeviceSessionRow): DeviceSessionSqlEntity {
    const session = new this();

    session.userId = row.user_id;
    session.deviceId = row.device_id;
    session.ip = row.ip;
    session.title = row.title;
    session.lastActiveDate = row.last_active_date;
    session.expirationDate = row.expiration_date;
    session.createdAt = row.created_at;
    session.updatedAt = row.updated_at;

    return session;
  }

  /**
   * Переезд сессии на новую пару токенов: старый refresh-токен после этого
   * перестаёт проходить проверку по lastActiveDate
   */
  refresh(lastActiveDate: Date, expirationDate: Date, ip: string): void {
    this.lastActiveDate = lastActiveDate;
    this.expirationDate = expirationDate;
    this.ip = ip;
  }

  //совпадает ли дата выпуска предъявленного refresh-токена с текущей версией сессии
  isIssuedAt(lastActiveDate: string): boolean {
    return this.lastActiveDate.toISOString() === lastActiveDate;
  }
}
