import { JwtService } from '@nestjs/jwt';

type Constants = typeof import('./auth.constants');
type TtlConstant = 'ACCESS_TOKEN_EXPIRES_IN' | 'REFRESH_TOKEN_EXPIRES_IN';

describe('auth token defaults (TypeORM blogs/posts stage)', () => {
  it.each([
    ['ACCESS_TOKEN_TTL', 'ACCESS_TOKEN_EXPIRES_IN', 300],
    ['REFRESH_TOKEN_TTL', 'REFRESH_TOKEN_EXPIRES_IN', 20],
  ] as const)(
    'issues tokens with the required lifetime for %s',
    async (envKey, constant: TtlConstant, seconds) => {
      const previous = process.env[envKey];
      delete process.env[envKey];
      try {
        //константы читают env при импорте — модуль нужно загрузить заново
        await jest.isolateModulesAsync(async () => {
          const constants: Constants = await import('./auth.constants');
          const jwt = new JwtService({ secret: 'test-only' });
          const token = jwt.sign(
            { userId: '1' },
            { expiresIn: constants[constant] },
          );
          const payload = jwt.decode<{ exp: number; iat: number }>(token);
          expect(payload.exp - payload.iat).toBe(seconds);
        });
      } finally {
        if (previous === undefined) delete process.env[envKey];
        else process.env[envKey] = previous;
      }
    },
  );
});
