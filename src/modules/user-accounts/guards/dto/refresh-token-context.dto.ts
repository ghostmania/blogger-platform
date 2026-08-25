import { UserContextDto } from './user-context.dto';

/**
 * То, что RefreshTokenStrategy кладёт в req.user: кроме пользователя нам нужно
 * знать, с какого устройства пришёл refresh-токен
 */
export class RefreshTokenContextDto extends UserContextDto {
  deviceId: string;
}

/**
 * payload refresh-токена
 */
export class RefreshTokenPayloadDto {
  id: string;
  deviceId: string;
  lastActiveDate: string;
}
