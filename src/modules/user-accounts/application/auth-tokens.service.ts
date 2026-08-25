import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ACCESS_TOKEN_STRATEGY_INJECT_TOKEN,
  REFRESH_TOKEN_STRATEGY_INJECT_TOKEN,
} from '../constants/auth-tokens.inject-constants';

export type IssuedRefreshToken = {
  token: string;
  //дата выпуска токена — она же версия сессии устройства
  lastActiveDate: Date;
  //exp из payload — до этого момента токен валиден
  expirationDate: Date;
};

/**
 * Единая точка выпуска токенов: и login, и refresh-token собирают пару одинаково,
 * поэтому логика подписи и вычисления сроков живёт здесь, а не в use case'ах.
 */
@Injectable()
export class AuthTokensService {
  constructor(
    @Inject(ACCESS_TOKEN_STRATEGY_INJECT_TOKEN)
    private accessTokenContext: JwtService,

    @Inject(REFRESH_TOKEN_STRATEGY_INJECT_TOKEN)
    private refreshTokenContext: JwtService,
  ) {}

  createAccessToken(userId: string): string {
    return this.accessTokenContext.sign({ id: userId });
  }

  createRefreshToken(userId: string, deviceId: string): IssuedRefreshToken {
    //lastActiveDate кладём в payload явно (не полагаемся на iat): у iat точность
    //до секунды, и два рефреша внутри одной секунды дали бы одинаковый токен
    const lastActiveDate = new Date();

    const token = this.refreshTokenContext.sign({
      id: userId,
      deviceId,
      lastActiveDate: lastActiveDate.toISOString(),
    });

    const { exp } = this.refreshTokenContext.decode<{ exp: number }>(token);

    return {
      token,
      lastActiveDate,
      expirationDate: new Date(exp * 1000),
    };
  }
}
