//dto для запроса списка постов с пагинацией и сортировкой
import { PostsSortBy } from './posts-sort-by';
import { BaseQueryParams } from '../../../../../core/dto/base.query-params.input-dto';
import { IsEnum } from 'class-validator';

export class GetPostsQueryParams extends BaseQueryParams {
  @IsEnum(PostsSortBy)
  sortBy = PostsSortBy.CreatedAt;
}
