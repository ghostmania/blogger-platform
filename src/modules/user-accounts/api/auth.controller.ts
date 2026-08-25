import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiBearerAuth, ApiBody, ApiCookieAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { LocalAuthGuard } from '../guards/local/local-auth.guard';
import { JwtAuthGuard } from '../guards/bearer/jwt-auth.guard';
import { RefreshTokenAuthGuard } from '../guards/refresh/refresh-token-auth.guard';
import { ExtractUserFromRequest } from '../guards/decorators/param/extract-user-from-request.decorator';
import { ExtractSessionFromRequest } from '../guards/decorators/param/extract-session-from-request.decorator';
import { UserContextDto } from '../guards/dto/user-context.dto';
import { RefreshTokenContextDto } from '../guards/dto/refresh-token-context.dto';
import { CreateUserInputDto } from './input-dto/users.input-dto';
import { RegistrationConfirmationInputDto } from './input-dto/registration-confirmation.input-dto';
import { RegistrationEmailResendingInputDto } from './input-dto/registration-email-resending.input-dto';
import { PasswordRecoveryInputDto } from './input-dto/password-recovery.input-dto';
import { NewPasswordInputDto } from './input-dto/new-password.input-dto';
import { MeViewDto } from './view-dto/users.view-dto';
import {
  LoginUserCommand,
  LoginUserResult,
} from '../application/usecases/login-user.usecase';
import {
  RefreshTokenCommand,
  RefreshTokenResult,
} from '../application/usecases/refresh-token.usecase';
import { LogoutCommand } from '../application/usecases/logout.usecase';
import { RegisterUserCommand } from '../application/usecases/register-user.usecase';
import { ConfirmRegistrationCommand } from '../application/usecases/confirm-registration.usecase';
import { ResendConfirmationEmailCommand } from '../application/usecases/resend-confirmation-email.usecase';
import { RecoverPasswordCommand } from '../application/usecases/recover-password.usecase';
import { SetNewPasswordCommand } from '../application/usecases/set-new-password.usecase';
import { GetMeQuery } from '../application/queries/get-me.query-handler';
import {
  clearRefreshTokenCookie,
  setRefreshTokenCookie,
} from './utils/refresh-token-cookie';

//если User-Agent не пришёл, всё равно нужно чем-то назвать устройство в списке сессий
const UNKNOWN_DEVICE_TITLE = 'Unknown device';

@Controller('auth')
export class AuthController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  //ThrottlerGuard стоит ПЕРЕД LocalAuthGuard: перебор паролей должен упираться
  //в 429 независимо от того, верные пришли креды или нет
  //логин и пароль проверяет локальная стратегия; в req.user кладётся UserContextDto
  @UseGuards(ThrottlerGuard, LocalAuthGuard)
  //swagger doc
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        loginOrEmail: { type: 'string', example: 'login123' },
        password: { type: 'string', example: 'superpassword' },
      },
    },
  })
  async login(
    @ExtractUserFromRequest() user: UserContextDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    //passthrough: Nest сам отправит возвращённое из метода тело, а нам нужен res только для cookie
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ accessToken: string }> {
    const { accessToken, refreshToken } = await this.commandBus.execute<
      LoginUserCommand,
      LoginUserResult
    >(new LoginUserCommand(user.id, ip, userAgent || UNKNOWN_DEVICE_TITLE));

    //refreshToken отдаём только в httpOnly cookie — в теле ответа его быть не должно
    setRefreshTokenCookie(response, refreshToken);

    return { accessToken };
  }

  @ApiCookieAuth()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  //гвард сам проверит, что refresh-токен из cookie валиден и не отозван
  @UseGuards(RefreshTokenAuthGuard)
  async refreshToken(
    @ExtractSessionFromRequest() session: RefreshTokenContextDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ accessToken: string }> {
    const { accessToken, refreshToken } = await this.commandBus.execute<
      RefreshTokenCommand,
      RefreshTokenResult
    >(new RefreshTokenCommand(session.id, session.deviceId, ip));

    //предъявленный refresh-токен после этого отозван — работает только новый
    setRefreshTokenCookie(response, refreshToken);

    return { accessToken };
  }

  @ApiCookieAuth()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RefreshTokenAuthGuard)
  async logout(
    @ExtractSessionFromRequest() session: RefreshTokenContextDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.commandBus.execute(new LogoutCommand(session.deviceId));

    clearRefreshTokenCookie(response);
  }

  @Post('password-recovery')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ThrottlerGuard)
  passwordRecovery(@Body() body: PasswordRecoveryInputDto): Promise<void> {
    return this.commandBus.execute(new RecoverPasswordCommand(body.email));
  }

  @Post('new-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ThrottlerGuard)
  newPassword(@Body() body: NewPasswordInputDto): Promise<void> {
    return this.commandBus.execute(
      new SetNewPasswordCommand(body.newPassword, body.recoveryCode),
    );
  }

  @Post('registration-confirmation')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ThrottlerGuard)
  registrationConfirmation(
    @Body() body: RegistrationConfirmationInputDto,
  ): Promise<void> {
    return this.commandBus.execute(new ConfirmRegistrationCommand(body.code));
  }

  @Post('registration')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ThrottlerGuard)
  registration(@Body() body: CreateUserInputDto): Promise<void> {
    return this.commandBus.execute(new RegisterUserCommand(body));
  }

  @Post('registration-email-resending')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ThrottlerGuard)
  registrationEmailResending(
    @Body() body: RegistrationEmailResendingInputDto,
  ): Promise<void> {
    return this.commandBus.execute(
      new ResendConfirmationEmailCommand(body.email),
    );
  }

  @ApiBearerAuth()
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@ExtractUserFromRequest() user: UserContextDto): Promise<MeViewDto> {
    return this.queryBus.execute(new GetMeQuery(user.id));
  }
}
