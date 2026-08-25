import { Response } from 'supertest';
import { REFRESH_TOKEN_COOKIE_NAME } from '../../src/modules/user-accounts/constants/auth.constants';

const getSetCookieHeaders = (response: Response): string[] => {
  const header = response.headers['set-cookie'];

  if (!header) {
    return [];
  }

  return Array.isArray(header) ? header : [header];
};

//находит cookie с refresh-токеном в Set-Cookie ответа
const findRefreshTokenCookie = (response: Response): string | undefined =>
  getSetCookieHeaders(response).find((cookie) =>
    cookie.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`),
  );

export const extractRefreshToken = (response: Response): string => {
  const cookie = findRefreshTokenCookie(response);

  if (!cookie) {
    throw new Error('Response has no refreshToken cookie');
  }

  return cookie.split(';')[0].split('=')[1];
};

//supertest не хранит cookie между запросами — собираем заголовок Cookie руками
export const refreshTokenCookie = (refreshToken: string): string =>
  `${REFRESH_TOKEN_COOKIE_NAME}=${refreshToken}`;

export const getRefreshTokenCookieAttributes = (
  response: Response,
): string | undefined => findRefreshTokenCookie(response);
