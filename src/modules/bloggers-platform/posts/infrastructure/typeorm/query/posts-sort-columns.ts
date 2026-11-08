import { SortDirection } from '../../../../../../core/dto/base.query-params.input-dto';
import { PostsSortBy } from '../../../api/input-dto/posts-sort-by';

//белый список колонок для ORDER BY — см. комментарий в blogs-sort-columns.ts
const SORT_COLUMNS: Record<PostsSortBy, string> = {
  [PostsSortBy.CreatedAt]: 'created_at',
  [PostsSortBy.Title]: 'title',
  [PostsSortBy.ShortDescription]: 'short_description',
  [PostsSortBy.Content]: 'content',
  [PostsSortBy.BlogId]: 'blog_id',
  [PostsSortBy.BlogName]: 'blog_name',
};

const SORT_DIRECTIONS: Record<SortDirection, 'ASC' | 'DESC'> = {
  [SortDirection.Asc]: 'ASC',
  [SortDirection.Desc]: 'DESC',
};

const TEXT_COLUMNS = new Set([
  'title',
  'short_description',
  'content',
  'blog_name',
]);

export function resolveSortExpression(sortBy: PostsSortBy): string {
  const column = SORT_COLUMNS[sortBy];

  if (!column) {
    throw new Error(`Unsupported sort column: ${sortBy}`);
  }

  return TEXT_COLUMNS.has(column) ? `${column} COLLATE "C"` : column;
}

export function resolveSortDirection(direction: SortDirection): 'ASC' | 'DESC' {
  const keyword = SORT_DIRECTIONS[direction];

  if (!keyword) {
    throw new Error(`Unsupported sort direction: ${direction}`);
  }

  return keyword;
}
