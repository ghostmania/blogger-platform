import { Extension } from '../domain-exceptions';
import { DomainExceptionCode } from '../domain-exception-codes';

export type ErrorResponseBody = {
  timestamp: string;
  path: string | null;
  message: string;
  extensions: Extension[];
  code: DomainExceptionCode;
};

//формат тела 400-й ошибки по swagger-спеке (APIErrorResult) — его ждут автотесты
export type ApiErrorResult = {
  errorsMessages: { message: string; field: string }[];
};
