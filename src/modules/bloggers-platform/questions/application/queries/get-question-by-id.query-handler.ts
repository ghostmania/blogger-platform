import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { QuestionViewDto } from '../../api/view-dto/questions.view-dto';
import { QuestionsTypeOrmQueryRepository } from '../../infrastructure/typeorm/query/questions.typeorm-query-repository';

//отдельного GET /sa/quiz/questions/:id в контракте нет — запрос нужен,
//чтобы POST вернул созданный вопрос
export class GetQuestionByIdQuery {
  constructor(public id: string) {}
}

@QueryHandler(GetQuestionByIdQuery)
export class GetQuestionByIdQueryHandler implements IQueryHandler<
  GetQuestionByIdQuery,
  QuestionViewDto
> {
  constructor(
    private questionsQueryRepository: QuestionsTypeOrmQueryRepository,
  ) {}

  async execute({ id }: GetQuestionByIdQuery): Promise<QuestionViewDto> {
    return this.questionsQueryRepository.getByIdOrNotFoundFail(id);
  }
}
