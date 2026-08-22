//TODO: move to configService. will be in the following lessons
export const ACCESS_TOKEN_SECRET =
  process.env.JWT_SECRET ?? 'access-token-secret';

export const ACCESS_TOKEN_EXPIRES_IN = '10m';
