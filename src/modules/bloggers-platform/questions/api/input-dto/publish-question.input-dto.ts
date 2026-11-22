import { IsBoolean } from 'class-validator';

//PublishInputModel: тело PUT /sa/quiz/questions/:id/publish
export class PublishQuestionInputDto {
  //строка "true" не пройдёт — нужен именно JSON boolean
  @IsBoolean()
  published: boolean;
}
