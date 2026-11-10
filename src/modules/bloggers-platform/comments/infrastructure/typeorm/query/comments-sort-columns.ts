import { SortDirection } from '../../../../../../core/dto/base.query-params.input-dto';
import { CommentsSortBy } from '../../../api/input-dto/comments-sort-by';

//белый список колонок для ORDER BY — см. комментарий в blogs-sort-columns.ts
const SORT_COLUMNS: Record<CommentsSortBy, string> = {
  [CommentsSortBy.CreatedAt]: 'created_at',
};

const SORT_DIRECTIONS: Record<SortDirection, 'ASC' | 'DESC'> = {
  [SortDirection.Asc]: 'ASC',
  [SortDirection.Desc]: 'DESC',
};

export function resolveSortExpression(sortBy: CommentsSortBy): string {
  const column = SORT_COLUMNS[sortBy];

  if (!column) {
    throw new Error(`Unsupported sort column: ${sortBy}`);
  }

  return column;
}

export function resolveSortDirection(direction: SortDirection): 'ASC' | 'DESC' {
  const keyword = SORT_DIRECTIONS[direction];

  if (!keyword) {
    throw new Error(`Unsupported sort direction: ${direction}`);
  }

  return keyword;
}
