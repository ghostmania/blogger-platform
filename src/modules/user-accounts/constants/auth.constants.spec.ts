import { JwtService } from '@nestjs/jwt';

describe('auth token defaults (TypeORM blogs/posts stage)', () => {
  it.each([
    ['ACCESS_TOKEN_TTL', 'ACCESS_TOKEN_EXPIRES_IN', 300],
    ['REFRESH_TOKEN_TTL', 'REFRESH_TOKEN_EXPIRES_IN', 20],
  ])(
    'issues tokens with the required lifetime for %s',
    (envKey, constant, seconds) => {
      const previous = process.env[envKey];
      delete process.env[envKey];
      try {
        jest.isolateModules(() => {
          const constants = require('./auth.constants');
          const jwt = new JwtService({ secret: 'test-only' });
          const token = jwt.sign(
            { userId: '1' },
            { expiresIn: constants[constant] },
          );
          const payload = jwt.decode(token) as { exp: number; iat: number };
          expect(payload.exp - payload.iat).toBe(seconds);
        });
      } finally {
        if (previous === undefined) delete process.env[envKey];
        else process.env[envKey] = previous;
      }
    },
  );
});
