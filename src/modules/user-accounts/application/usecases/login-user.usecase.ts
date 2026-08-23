import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import {
  ACCESS_TOKEN_STRATEGY_INJECT_TOKEN,
  REFRESH_TOKEN_STRATEGY_INJECT_TOKEN,
} from '../../constants/auth-tokens.inject-constants';

export type LoginUserResult = {
  accessToken: string;
  refreshToken: string;
};

export class LoginUserCommand {
  constructor(public userId: string) {}
}

@CommandHandler(LoginUserCommand)
export class LoginUserUseCase implements ICommandHandler<
  LoginUserCommand,
  LoginUserResult
> {
  constructor(
    @Inject(ACCESS_TOKEN_STRATEGY_INJECT_TOKEN)
    private accessTokenContext: JwtService,

    @Inject(REFRESH_TOKEN_STRATEGY_INJECT_TOKEN)
    private refreshTokenContext: JwtService,
  ) {}

  async execute({ userId }: LoginUserCommand): Promise<LoginUserResult> {
    const accessToken = this.accessTokenContext.sign({ id: userId });

    //deviceId — заглушка: обновление пары токенов (/auth/refresh-token)
    //и учёт сессий устройств появятся в следующем задании
    const refreshToken = this.refreshTokenContext.sign({
      id: userId,
      deviceId: randomUUID(),
    });

    return { accessToken, refreshToken };
  }
}
