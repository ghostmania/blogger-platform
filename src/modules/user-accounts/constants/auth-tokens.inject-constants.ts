//access и refresh токены подписываются разными секретами с разным временем жизни,
//поэтому в IoC живут два отдельных экземпляра JwtService под своими токенами
export const ACCESS_TOKEN_STRATEGY_INJECT_TOKEN = 'ACCESS_TOKEN_STRATEGY';

export const REFRESH_TOKEN_STRATEGY_INJECT_TOKEN = 'REFRESH_TOKEN_STRATEGY';
