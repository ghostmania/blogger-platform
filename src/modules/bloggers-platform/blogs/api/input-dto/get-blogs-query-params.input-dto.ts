//dto для запроса списка блогов с пагинацией, сортировкой, поиском по имени
import { BlogsSortBy } from './blogs-sort-by';
import { BaseQueryParams } from '../../../../../core/dto/base.query-params.input-dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GetBlogsQueryParams extends BaseQueryParams {
  @IsEnum(BlogsSortBy)
  sortBy = BlogsSortBy.CreatedAt;

  @IsString()
  @IsOptional()
  searchNameTerm: string | null = null;
}
