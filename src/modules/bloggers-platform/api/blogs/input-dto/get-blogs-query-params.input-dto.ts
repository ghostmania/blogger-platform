//dto для запроса списка блогов с пагинацией, сортировкой, поиском по имени
import { BlogsSortBy } from './blogs-sort-by';
import { BaseQueryParams } from '../../../../../core/dto/base.query-params.input-dto';

export class GetBlogsQueryParams extends BaseQueryParams {
  sortBy = BlogsSortBy.CreatedAt;
  searchNameTerm: string | null = null;
}
