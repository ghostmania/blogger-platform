import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { SecurityDevicesRepository } from '../../infrastructure/security-devices.repository.abstract';
import { AuthTokensService } from '../auth-tokens.service';

export type LoginUserResult = {
  accessToken: string;
  refreshToken: string;
};

export class LoginUserCommand {
  constructor(
    public userId: string,
    public ip: string,
    public userAgent: string,
  ) {}
}

@CommandHandler(LoginUserCommand)
export class LoginUserUseCase
  implements ICommandHandler<LoginUserCommand, LoginUserResult>
{
  constructor(
    //как и в CreateUserUseCase: модель мангуста ушла, сессию создаёт репозиторий
    private securityDevicesRepository: SecurityDevicesRepository,
    private authTokensService: AuthTokensService,
  ) {}

  async execute({
    userId,
    ip,
    userAgent,
  }: LoginUserCommand): Promise<LoginUserResult> {
    //каждый логин — это новое устройство: отдельный deviceId и отдельная сессия,
    //поэтому один и тот же юзер может держать несколько независимых сессий
    const deviceId = randomUUID();

    const accessToken = this.authTokensService.createAccessToken(userId);
    const { token, lastActiveDate, expirationDate } =
      this.authTokensService.createRefreshToken(userId, deviceId);

    const session = this.securityDevicesRepository.createInstance({
      userId,
      deviceId,
      ip,
      title: userAgent,
      lastActiveDate,
      expirationDate,
    });

    await this.securityDevicesRepository.save(session);

    return { accessToken, refreshToken: token };
  }
}
