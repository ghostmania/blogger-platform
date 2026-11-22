import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../../../domain/question.entity';
import { QuestionViewDto } from '../../../api/view-dto/questions.view-dto';
import {
  GetQuestionsQueryParams,
  PublishedStatus,
} from '../../../api/input-dto/get-questions-query-params.input-dto';
import { PaginatedViewDto } from '../../../../../../core/dto/base.paginated.view-dto';
import { DomainException } from '../../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../../core/exceptions/domain-exception-codes';
import { isBigintId } from '../../../../../../core/database/bigint-id';
import {
  resolveSortDirection,
  resolveSortExpression,
} from './questions-sort-columns';

@Injectable()
export class QuestionsTypeOrmQueryRepository {
  constructor(
    @InjectRepository(Question)
    private readonly repository: Repository<Question>,
  ) {}

  async getAll(
    query: GetQuestionsQueryParams,
  ): Promise<PaginatedViewDto<QuestionViewDto[]>> {
    const builder = this.repository.createQueryBuilder('q');

    if (query.bodySearchTerm !== null) {
      builder.andWhere('q.body ILIKE :term', {
        term: `%${query.bodySearchTerm}%`,
      });
    }

    //all — без фильтра; andWhere, чтобы не затереть условие поиска выше
    if (query.publishedStatus !== PublishedStatus.All) {
      builder.andWhere('q.published = :published', {
        published: query.publishedStatus === PublishedStatus.Published,
      });
    }

    //вторичная сортировка по id делает порядок детерминированным при равных значениях
    const direction = resolveSortDirection(query.sortDirection);
    const [questions, totalCount] = await builder
      .orderBy(resolveSortExpression(query.sortBy), direction)
      .addOrderBy('q.id', direction)
      .offset(query.calculateSkip())
      .limit(query.pageSize)
      .getManyAndCount();

    return PaginatedViewDto.mapToView({
      items: questions.map((question) => QuestionViewDto.mapToView(question)),
      totalCount,
      page: query.pageNumber,
      size: query.pageSize,
    });
  }

  async getByIdOrNotFoundFail(id: string): Promise<QuestionViewDto> {
    const question = isBigintId(id)
      ? await this.repository.findOneBy({ id })
      : null;

    if (!question) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Question not found',
      });
    }

    return QuestionViewDto.mapToView(question);
  }
}
