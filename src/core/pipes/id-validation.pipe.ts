import { Injectable, PipeTransform } from '@nestjs/common';
import { DomainException } from '../exceptions/domain-exceptions';
import { DomainExceptionCode } from '../exceptions/domain-exception-codes';

//монго-режим: 24 hex-символа
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
//SQL-режим: bigserial; node-postgres отдаёт int8 строкой, поэтому id везде string
const POSITIVE_INTEGER = /^[1-9]\d*$/;

/**
 * Заменяет ObjectIdValidationPipe: контроллер один на обе реализации,
 * поэтому пайп принимает id в любом из двух форматов.
 *
 * Без него `DELETE /users/мусор` в SQL-режиме дошёл бы до запроса и упал в 500
 * («invalid input syntax for type bigint») вместо ожидаемого 400.
 *
 * Not add it globally. Use only locally.
 */
@Injectable()
export class IdValidationPipe implements PipeTransform {
  transform(value: string): string {
    if (!OBJECT_ID.test(value) && !POSITIVE_INTEGER.test(value)) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: `Invalid id: ${value}`,
      });
    }

    return value;
  }
}
