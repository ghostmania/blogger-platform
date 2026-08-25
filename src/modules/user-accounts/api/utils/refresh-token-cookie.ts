import { CookieOptions, Response } from 'express';
import { REFRESH_TOKEN_COOKIE_NAME } from '../../constants/auth.constants';

//httpOnly + secure требует swagger-спека: refresh-токен не должен быть доступен
//из JS и не должен уходить по незашифрованному соединению
const REFRESH_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
};

export function setRefreshTokenCookie(
  response: Response,
  refreshToken: string,
): void {
  response.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    refreshToken,
    REFRESH_TOKEN_COOKIE_OPTIONS,
  );
}

export function clearRefreshTokenCookie(response: Response): void {
  response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_OPTIONS);
}
