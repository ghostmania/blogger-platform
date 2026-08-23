import { IsString, Length } from 'class-validator';
import { Trim } from '../../../../../core/decorators/transform/trim';

//dto для боди при создании/обновлении комментария
export class CreateCommentInputDto {
  @Trim()
  @IsString()
  @Length(20, 300)
  content: string;
}
