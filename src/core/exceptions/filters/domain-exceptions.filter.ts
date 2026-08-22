import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { DomainException } from '../domain-exceptions';
import { Request, Response } from 'express';
import { DomainExceptionCode } from '../domain-exception-codes';
import { ApiErrorResult, ErrorResponseBody } from './error-response-body.type';

//https://docs.nestjs.com/exception-filters#exception-filters-1
//Ошибки класса DomainException (instanceof DomainException)
@Catch(DomainException)
export class DomainHttpExceptionsFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.mapToHttpStatus(exception.code);

    //400 отдаём в формате APIErrorResult из swagger-спеки: его ждут автотесты.
    //Для остальных статусов тело не специфицировано — отдаём подробный доменный формат
    if (status === HttpStatus.BAD_REQUEST) {
      response.status(status).json(this.buildApiErrorResult(exception));
      return;
    }

    response
      .status(status)
      .json(this.buildResponseBody(exception, request.url));
  }

  private mapToHttpStatus(code: DomainExceptionCode): number {
    switch (code) {
      case DomainExceptionCode.BadRequest:
      case DomainExceptionCode.ValidationError:
      case DomainExceptionCode.ConfirmationCodeExpired:
      case DomainExceptionCode.EmailNotConfirmed:
      case DomainExceptionCode.PasswordRecoveryCodeExpired:
        return HttpStatus.BAD_REQUEST;
      case DomainExceptionCode.Forbidden:
        return HttpStatus.FORBIDDEN;
      case DomainExceptionCode.NotFound:
        return HttpStatus.NOT_FOUND;
      case DomainExceptionCode.Unauthorized:
        return HttpStatus.UNAUTHORIZED;
      case DomainExceptionCode.InternalServerError:
        return HttpStatus.INTERNAL_SERVER_ERROR;
      default:
        return HttpStatus.I_AM_A_TEAPOT;
    }
  }

  //extensions[].key -> field; если extensions пустые, поле определить нельзя — отдаём пустую строку
  private buildApiErrorResult(exception: DomainException): ApiErrorResult {
    if (!exception.extensions.length) {
      return {
        errorsMessages: [{ message: exception.message, field: '' }],
      };
    }

    return {
      errorsMessages: exception.extensions.map((extension) => ({
        message: extension.message,
        field: extension.key,
      })),
    };
  }

  private buildResponseBody(
    exception: DomainException,
    requestUrl: string,
  ): ErrorResponseBody {
    return {
      timestamp: new Date().toISOString(),
      path: requestUrl,
      message: exception.message,
      code: exception.code,
      extensions: exception.extensions,
    };
  }
}
