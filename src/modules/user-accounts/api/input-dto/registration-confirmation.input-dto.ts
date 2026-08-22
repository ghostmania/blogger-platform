import { IsString } from 'class-validator';
import { Trim } from '../../../../core/decorators/transform/trim';

//dto для боди POST /auth/registration-confirmation
export class RegistrationConfirmationInputDto {
  @IsString()
  @Trim()
  code: string;
}
