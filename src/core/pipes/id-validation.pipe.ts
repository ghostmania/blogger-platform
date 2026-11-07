import { Injectable, PipeTransform } from '@nestjs/common';
import { DomainException } from '../exceptions/domain-exceptions';
import { DomainExceptionCode } from '../exceptions/domain-exception-codes';

const POSITIVE_INTEGER = /^[1-9]\d*$/;

@Injectable()
export class IdValidationPipe implements PipeTransform {
  transform(value: string): string {
    if (!POSITIVE_INTEGER.test(value)) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: `Invalid id: ${value}`,
      });
    }

    return value;
  }
}
