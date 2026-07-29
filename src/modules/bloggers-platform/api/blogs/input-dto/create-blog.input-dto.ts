import { IsString, Length, Matches } from 'class-validator';
import { Trim } from '../../decorators/trim';

//паттерн валидного websiteUrl (https://...)
const WEBSITE_URL_PATTERN =
  /^https:\/\/([a-zA-Z0-9_-]+\.)+[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*\/?$/;

//dto для боди при создании блога
export class CreateBlogInputDto {
  @Trim()
  @IsString()
  @Length(1, 15)
  name: string;

  @Trim()
  @IsString()
  @Length(1, 500)
  description: string;

  @Trim()
  @IsString()
  @Length(1, 100)
  @Matches(WEBSITE_URL_PATTERN)
  websiteUrl: string;
}
