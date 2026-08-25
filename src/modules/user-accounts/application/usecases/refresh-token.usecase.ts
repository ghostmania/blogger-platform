import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SecurityDevicesRepository } from '../../infrastructure/security-devices.repository';
import { AuthTokensService } from '../auth-tokens.service';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

export type RefreshTokenResult = {
  accessToken: string;
  refreshToken: string;
};

export class RefreshTokenCommand {
  constructor(
    public userId: string,
    public deviceId: string,
    public ip: string,
  ) {}
}

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenUseCase implements ICommandHandler<
  RefreshTokenCommand,
  RefreshTokenResult
> {
  constructor(
    private securityDevicesRepository: SecurityDevicesRepository,
    private authTokensService: AuthTokensService,
  ) {}

  async execute({
    userId,
    deviceId,
    ip,
  }: RefreshTokenCommand): Promise<RefreshTokenResult> {
    const session =
      await this.securityDevicesRepository.findByDeviceId(deviceId);

    //живость сессии уже проверил RefreshTokenAuthGuard; здесь страхуемся от гонки
    //(параллельный logout/terminate между guard'ом и хендлером)
    if (!session) {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Device session not found',
      });
    }

    const accessToken = this.authTokensService.createAccessToken(userId);
    const { token, lastActiveDate, expirationDate } =
      this.authTokensService.createRefreshToken(userId, deviceId);

    //перевод сессии на новый токен отзывает предыдущий: старый lastActiveDate
    //больше не совпадёт с тем, что лежит в БД
    session.refresh(lastActiveDate, expirationDate, ip);
    await this.securityDevicesRepository.save(session);

    return { accessToken, refreshToken: token };
  }
}
