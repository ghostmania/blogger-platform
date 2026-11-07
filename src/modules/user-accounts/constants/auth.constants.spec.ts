import { JwtService } from '@nestjs/jwt';

describe('assignment auth defaults', () => {
  it('issues access tokens valid for at least five minutes by default', () => {
    const previous = process.env.ACCESS_TOKEN_TTL;
    delete process.env.ACCESS_TOKEN_TTL;
    try {
      jest.isolateModules(() => {
        const { ACCESS_TOKEN_EXPIRES_IN } = require('./auth.constants');
        const jwt = new JwtService({ secret: 'test-only' });
        const token = jwt.sign(
          { userId: '1' },
          { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
        );
        const payload = jwt.decode(token) as { exp: number; iat: number };
        expect(payload.exp - payload.iat).toBeGreaterThanOrEqual(300);
      });
    } finally {
      if (previous === undefined) delete process.env.ACCESS_TOKEN_TTL;
      else process.env.ACCESS_TOKEN_TTL = previous;
    }
  });
});
