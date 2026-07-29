import { IsString, Length } from 'class-validator';
import { Trim } from '../../decorators/trim';

//dto для боди при создании поста (blogId приходит в теле)
export class CreatePostInputDto {
  @Trim()
  @IsString()
  @Length(1, 30)
  title: string;

  @Trim()
  @IsString()
  @Length(1, 100)
  shortDescription: string;

  @Trim()
  @IsString()
  @Length(1, 1000)
  content: string;

  @Trim()
  @IsString()
  blogId: string;
}
