import { IsString, Matches } from 'class-validator';
import { Trim } from '../../../../core/decorators/transform/trim';
import { UpdateUserDto } from '../../dto/create-user.dto';
import { emailConstraints } from '../../domain/user.entity';

//без декораторов валидации поле вырезал бы whitelist: true в глобальном ValidationPipe
export class UpdateUserInputDto implements UpdateUserDto {
  @IsString()
  @Matches(emailConstraints.match)
  @Trim()
  email: string;
}
