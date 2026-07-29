//dto для запроса списка постов с пагинацией и сортировкой
import { PostsSortBy } from './posts-sort-by';
import { BaseQueryParams } from '../../../../../core/dto/base.query-params.input-dto';

export class GetPostsQueryParams extends BaseQueryParams {
  sortBy = PostsSortBy.CreatedAt;
}
