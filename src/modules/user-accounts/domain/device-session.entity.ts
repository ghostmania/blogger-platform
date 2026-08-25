import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model } from 'mongoose';
import { CreateDeviceSessionDomainDto } from './dto/create-device-session.domain.dto';

/**
 * Сессия устройства (multi-device flow).
 * Одна запись = один активный refresh-токен: пара «пользователь + устройство».
 */
@Schema({ timestamps: true })
export class DeviceSession {
  /**
   * Владелец сессии
   */
  @Prop({ type: String, required: true })
  userId: string;

  /**
   * Идентификатор устройства, живёт внутри refresh-токена и не меняется при рефреше
   */
  @Prop({ type: String, required: true })
  deviceId: string;

  /**
   * IP, с которого была выпущена последняя пара токенов
   */
  @Prop({ type: String, required: true })
  ip: string;

  /**
   * Название устройства — берём из заголовка User-Agent
   */
  @Prop({ type: String, required: true })
  title: string;

  /**
   * Дата выпуска ТЕКУЩЕГО refresh-токена. Играет роль версии сессии: токен со
   * «старой» датой считается отозванным, поэтому один refresh-токен нельзя
   * использовать дважды.
   */
  @Prop({ type: Date, required: true })
  lastActiveDate: Date;

  /**
   * Срок жизни текущего refresh-токена (exp из payload)
   */
  @Prop({ type: Date, required: true })
  expirationDate: Date;

  createdAt: Date;
  updatedAt: Date;

  /**
   * Фабричный метод: сессия создаётся только вместе с выпущенным refresh-токеном
   */
  static createInstance(
    dto: CreateDeviceSessionDomainDto,
  ): DeviceSessionDocument {
    const session = new this();
    session.userId = dto.userId;
    session.deviceId = dto.deviceId;
    session.ip = dto.ip;
    session.title = dto.title;
    session.lastActiveDate = dto.lastActiveDate;
    session.expirationDate = dto.expirationDate;

    return session as DeviceSessionDocument;
  }

  /**
   * Переезд сессии на новую пару токенов: старый refresh-токен после этого
   * перестаёт проходить проверку по lastActiveDate
   */
  refresh(lastActiveDate: Date, expirationDate: Date, ip: string) {
    this.lastActiveDate = lastActiveDate;
    this.expirationDate = expirationDate;
    this.ip = ip;
  }

  /**
   * Совпадает ли дата выпуска предъявленного refresh-токена с текущей версией сессии
   */
  isIssuedAt(lastActiveDate: string): boolean {
    return this.lastActiveDate.toISOString() === lastActiveDate;
  }
}

export const DeviceSessionSchema = SchemaFactory.createForClass(DeviceSession);

//deviceId — фактический ключ сессии, ищем по нему в каждом запросе с refresh-токеном
DeviceSessionSchema.index({ deviceId: 1 }, { unique: true });
DeviceSessionSchema.index({ userId: 1 });
//протухшие сессии подчищает сам mongo, чтобы коллекция не росла бесконечно
DeviceSessionSchema.index({ expirationDate: 1 }, { expireAfterSeconds: 0 });

DeviceSessionSchema.loadClass(DeviceSession);

export type DeviceSessionDocument = HydratedDocument<DeviceSession>;

export type DeviceSessionModelType = Model<DeviceSessionDocument> &
  typeof DeviceSession;
