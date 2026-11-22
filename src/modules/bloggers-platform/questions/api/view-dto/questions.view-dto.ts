import { Question } from '../../domain/question.entity';

export class QuestionViewDto {
  id: string;
  body: string;
  correctAnswers: string[];
  published: boolean;
  createdAt: Date;
  updatedAt: Date | null;

  static mapToView(question: Question): QuestionViewDto {
    const dto = new QuestionViewDto();
    dto.id = question.id;
    dto.body = question.body;
    dto.correctAnswers = question.correctAnswers;
    dto.published = question.published;
    dto.createdAt = question.createdAt;
    dto.updatedAt = question.updatedAt;
    return dto;
  }
}
