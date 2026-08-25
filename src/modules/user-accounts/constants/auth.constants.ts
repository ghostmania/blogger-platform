import type { JwtSignOptions } from '@nestjs/jwt';

//jsonwebtoken принимает не любую строку, а шаблон вида '10s' | '20m' | number;
//из env приходит просто string, поэтому сужаем тип явно
type TokenExpiresIn = JwtSignOptions['expiresIn'];

//TODO: move to configService. will be in the following lessons
export const ACCESS_TOKEN_SECRET =
  process.env.JWT_SECRET ?? 'access-token-secret';

//СПЕЦИАЛЬНО короткие сроки: автотесты инкубатора ждут, что access протухнет
//после паузы в 10 секунд, а refresh — после 20. Переопределяются через env,
//если нужно погонять руками без постоянного релогина
export const ACCESS_TOKEN_EXPIRES_IN = (process.env.ACCESS_TOKEN_TTL ??
  '10s') as TokenExpiresIn;

export const REFRESH_TOKEN_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'refresh-token-secret';

export const REFRESH_TOKEN_EXPIRES_IN = (process.env.REFRESH_TOKEN_TTL ??
  '20s') as TokenExpiresIn;

//сроки жизни кодов из писем
export const CONFIRMATION_CODE_TTL_MS = 24 * 60 * 60 * 1000; //24 часа
export const RECOVERY_CODE_TTL_MS = 60 * 60 * 1000; //1 час

//имя cookie с refresh-токеном (проверяется автотестами при логине)
export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

//ip-restriction: не больше RATE_LIMIT_MAX запросов с одного IP на один эндпоинт
//за окно RATE_LIMIT_WINDOW_MS, дальше — 429
export const RATE_LIMIT_WINDOW_MS = 10 * 1000;
export const RATE_LIMIT_MAX = 5;
