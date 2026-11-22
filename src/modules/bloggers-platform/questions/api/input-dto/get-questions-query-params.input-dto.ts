//dto для запроса списка вопросов: пагинация, сортировка, поиск по тексту, фильтр публикации
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BaseQueryParams } from '../../../../../core/dto/base.query-params.input-dto';
import { QuestionsSortBy } from './questions-sort-by';

export enum PublishedStatus {
  All = 'all',
  Published = 'published',
  NotPublished = 'notPublished',
}

export class GetQuestionsQueryParams extends BaseQueryParams {
  @IsEnum(QuestionsSortBy)
  sortBy = QuestionsSortBy.CreatedAt;

  @IsString()
  @IsOptional()
  bodySearchTerm: string | null = null;

  @IsEnum(PublishedStatus)
  publishedStatus = PublishedStatus.All;
}
