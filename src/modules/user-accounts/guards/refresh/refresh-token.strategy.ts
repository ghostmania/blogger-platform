import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SecurityDevicesRepository } from '../../infrastructure/security-devices.repository.abstract';
import {
  RefreshTokenContextDto,
  RefreshTokenPayloadDto,
} from '../dto/refresh-token-context.dto';
import {
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_SECRET,
} from '../../constants/auth.constants';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

export const REFRESH_TOKEN_STRATEGY_NAME = 'refresh-jwt';

//refresh-токен приходит только в httpOnly cookie, из заголовков его не читаем
const extractRefreshTokenFromCookie = (request: Request): string | null =>
  request?.cookies?.[REFRESH_TOKEN_COOKIE_NAME] ?? null;

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  REFRESH_TOKEN_STRATEGY_NAME,
) {
  constructor(private securityDevicesRepository: SecurityDevicesRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractRefreshTokenFromCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: REFRESH_TOKEN_SECRET,
    });
  }

  /**
   * Валидной подписи мало: токен должен ещё соответствовать ЖИВОЙ сессии устройства.
   * Сессии нет — был logout или устройство отключили; lastActiveDate не совпал —
   * этим токеном уже рефрешились, и он отозван.
   */
  async validate(
    payload: RefreshTokenPayloadDto,
  ): Promise<RefreshTokenContextDto> {
    const session = await this.securityDevicesRepository.findByDeviceId(
      payload.deviceId,
    );

    if (!session || !session.isIssuedAt(payload.lastActiveDate)) {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Refresh token is revoked or expired',
      });
    }

    return { id: payload.id, deviceId: payload.deviceId };
  }
}
