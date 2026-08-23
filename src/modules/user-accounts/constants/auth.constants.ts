//TODO: move to configService. will be in the following lessons
export const ACCESS_TOKEN_SECRET =
  process.env.JWT_SECRET ?? 'access-token-secret';

export const ACCESS_TOKEN_EXPIRES_IN = '10m';

export const REFRESH_TOKEN_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'refresh-token-secret';

export const REFRESH_TOKEN_EXPIRES_IN = '20m';

//сроки жизни кодов из писем
export const CONFIRMATION_CODE_TTL_MS = 24 * 60 * 60 * 1000; //24 часа
export const RECOVERY_CODE_TTL_MS = 60 * 60 * 1000; //1 час

//имя cookie с refresh-токеном (проверяется автотестами при логине)
export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
