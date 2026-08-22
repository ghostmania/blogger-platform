import { IsString } from 'class-validator';
import { Trim } from '../../../../core/decorators/transform/trim';
import { passwordConstraints } from '../../domain/user.entity';
import { IsStringWithTrim } from '../../../../core/decorators/validation/is-string-with-trim';

//dto для боди POST /auth/new-password
export class NewPasswordInputDto {
  @IsStringWithTrim(
    passwordConstraints.minLength,
    passwordConstraints.maxLength,
  )
  newPassword: string;

  @IsString()
  @Trim()
  recoveryCode: string;
}
