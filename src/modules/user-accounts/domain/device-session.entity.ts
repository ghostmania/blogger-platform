import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CreateDeviceSessionDomainDto } from './dto/create-device-session.domain.dto';

@Entity('device_sessions')
@Index('device_sessions_user_id_idx', ['userId'])
export class DeviceSession {
  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;
  //живёт внутри refresh-токена и не меняется при рефреше; он же PRIMARY KEY
  @PrimaryColumn({ name: 'device_id', type: 'uuid' })
  deviceId: string;
  @Column({ type: 'varchar', length: 64 })
  ip: string;
  //название устройства — берём из заголовка User-Agent
  @Column({ type: 'varchar', length: 255 })
  title: string;
  /**
   * Дата выпуска ТЕКУЩЕГО refresh-токена. Играет роль версии сессии: токен со
   * «старой» датой считается отозванным, поэтому один refresh-токен нельзя
   * использовать дважды.
   */
  @Column({ name: 'last_active_date', type: 'timestamptz' })
  lastActiveDate: Date;
  //срок жизни текущего refresh-токена (exp из payload)
  @Column({ name: 'expiration_date', type: 'timestamptz' })
  expirationDate: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  //сессия создаётся только вместе с уже выпущенным refresh-токеном
  static createInstance(dto: CreateDeviceSessionDomainDto): DeviceSession {
    const session = new this();

    session.userId = dto.userId;
    session.deviceId = dto.deviceId;
    session.ip = dto.ip;
    session.title = dto.title;
    session.lastActiveDate = dto.lastActiveDate;
    session.expirationDate = dto.expirationDate;

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
