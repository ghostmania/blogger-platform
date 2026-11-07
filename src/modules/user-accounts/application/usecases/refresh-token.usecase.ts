import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SecurityDevicesRepository } from '../../infrastructure/security-devices.repository.abstract';
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
    public lastActiveDate: string,
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
    lastActiveDate: previousLastActiveDate,
  }: RefreshTokenCommand): Promise<RefreshTokenResult> {
    const session =
      await this.securityDevicesRepository.findByDeviceId(deviceId);

    //живость сессии уже проверил RefreshTokenAuthGuard; здесь страхуемся от гонки
    //(параллельный logout/terminate между guard'ом и хендлером)
    if (
      !session ||
      session.userId !== userId ||
      !session.isIssuedAt(previousLastActiveDate) ||
      session.expirationDate.getTime() <= Date.now()
    ) {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Device session not found',
      });
    }

    const accessToken = this.authTokensService.createAccessToken(userId);
    const { token, lastActiveDate, expirationDate } =
      this.authTokensService.createRefreshToken(
        userId,
        deviceId,
        new Date(previousLastActiveDate),
      );

    //перевод сессии на новый токен отзывает предыдущий: старый lastActiveDate
    //больше не совпадёт с тем, что лежит в БД
    session.refresh(lastActiveDate, expirationDate, ip);
    const rotated = await this.securityDevicesRepository.rotate(
      session,
      new Date(previousLastActiveDate),
    );
    if (!rotated) {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Refresh token is revoked or expired',
      });
    }

    return { accessToken, refreshToken: token };
  }
}
