import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { LocalAuthGuard } from '../guards/local/local-auth.guard';
import { JwtAuthGuard } from '../guards/bearer/jwt-auth.guard';
import { ExtractUserFromRequest } from '../guards/decorators/param/extract-user-from-request.decorator';
import { UserContextDto } from '../guards/dto/user-context.dto';
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
import { RegisterUserCommand } from '../application/usecases/register-user.usecase';
import { ConfirmRegistrationCommand } from '../application/usecases/confirm-registration.usecase';
import { ResendConfirmationEmailCommand } from '../application/usecases/resend-confirmation-email.usecase';
import { RecoverPasswordCommand } from '../application/usecases/recover-password.usecase';
import { SetNewPasswordCommand } from '../application/usecases/set-new-password.usecase';
import { GetMeQuery } from '../application/queries/get-me.query-handler';
import { REFRESH_TOKEN_COOKIE_NAME } from '../constants/auth.constants';

@Controller('auth')
export class AuthController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  //логин и пароль проверяет локальная стратегия; в req.user кладётся UserContextDto
  @UseGuards(LocalAuthGuard)
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
    //passthrough: Nest сам отправит возвращённое из метода тело, а нам нужен res только для cookie
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ accessToken: string }> {
    const { accessToken, refreshToken } = await this.commandBus.execute<
      LoginUserCommand,
      LoginUserResult
    >(new LoginUserCommand(user.id));

    //refreshToken отдаём только в httpOnly cookie — в теле ответа его быть не должно
    response.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: true,
    });

    return { accessToken };
  }

  @Post('password-recovery')
  @HttpCode(HttpStatus.NO_CONTENT)
  passwordRecovery(@Body() body: PasswordRecoveryInputDto): Promise<void> {
    return this.commandBus.execute(new RecoverPasswordCommand(body.email));
  }

  @Post('new-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  newPassword(@Body() body: NewPasswordInputDto): Promise<void> {
    return this.commandBus.execute(
      new SetNewPasswordCommand(body.newPassword, body.recoveryCode),
    );
  }

  @Post('registration-confirmation')
  @HttpCode(HttpStatus.NO_CONTENT)
  registrationConfirmation(
    @Body() body: RegistrationConfirmationInputDto,
  ): Promise<void> {
    return this.commandBus.execute(new ConfirmRegistrationCommand(body.code));
  }

  @Post('registration')
  @HttpCode(HttpStatus.NO_CONTENT)
  registration(@Body() body: CreateUserInputDto): Promise<void> {
    return this.commandBus.execute(new RegisterUserCommand(body));
  }

  @Post('registration-email-resending')
  @HttpCode(HttpStatus.NO_CONTENT)
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
