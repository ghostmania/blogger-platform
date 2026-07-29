import { IsString, Length } from 'class-validator';
import { Trim } from '../../decorators/trim';

//dto для боди при создании поста внутри блога (POST /blogs/:blogId/posts) — blogId берётся из параметра пути
export class CreatePostForBlogInputDto {
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
}
