import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetQuestionsQueryParams } from '../../api/input-dto/get-questions-query-params.input-dto';
import { QuestionViewDto } from '../../api/view-dto/questions.view-dto';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { QuestionsTypeOrmQueryRepository } from '../../infrastructure/typeorm/query/questions.typeorm-query-repository';

export class GetQuestionsQuery {
  constructor(public queryParams: GetQuestionsQueryParams) {}
}

@QueryHandler(GetQuestionsQuery)
export class GetQuestionsQueryHandler implements IQueryHandler<
  GetQuestionsQuery,
  PaginatedViewDto<QuestionViewDto[]>
> {
  constructor(
    private questionsQueryRepository: QuestionsTypeOrmQueryRepository,
  ) {}

  async execute({
    queryParams,
  }: GetQuestionsQuery): Promise<PaginatedViewDto<QuestionViewDto[]>> {
    return this.questionsQueryRepository.getAll(queryParams);
  }
}
