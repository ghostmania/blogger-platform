import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';
import { IsStringWithTrim } from '../../../../../core/decorators/validation/is-string-with-trim';

//QuestionInputModel: одно и то же тело у POST и PUT /sa/quiz/questions
export class QuestionInputDto {
  @IsStringWithTrim(10, 500)
  body: string;

  //все допустимые варианты правильного ответа, например ['6', 'six', 'шесть']
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  correctAnswers: string[];
}
