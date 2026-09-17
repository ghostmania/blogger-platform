import { SortDirection } from '../../../../../../core/dto/base.query-params.input-dto';
import { BlogsSortBy } from '../../../api/input-dto/blogs-sort-by';

const SORT_COLUMNS: Record<BlogsSortBy, string> = {
  [BlogsSortBy.CreatedAt]: 'created_at',
  [BlogsSortBy.Name]: 'name',
  [BlogsSortBy.Description]: 'description',
  [BlogsSortBy.WebsiteUrl]: 'websiteUrl',
  [BlogsSortBy.IsMembership]: 'isMembership',
};

const SORT_DIRECTIONS: Record<SortDirection, string> = {
  [SortDirection.Asc]: 'ASC',
  [SortDirection.Desc]: 'DESC',
};

const TEXT_COLUMNS = new Set(['name', 'description', 'websiteUrl']);


export function resolveSortColumn(sortBy: BlogsSortBy): string {
  const column = SORT_COLUMNS[sortBy];

  if (!column) {
    throw new Error(`Unsupported sort column: ${sortBy}`);
  }

  return column;
}
export function resolveSortExpression(sortBy: BlogsSortBy): string {
  const column = resolveSortColumn(sortBy);

  return TEXT_COLUMNS.has(column) ? `${column} COLLATE "C"` : column;}

export function resolveSortDirection(direction: SortDirection): string {
  const keyword = SORT_DIRECTIONS[direction];

  if (!keyword) {
    throw new Error(`Unsupported sort direction: ${direction}`);
  }

  return keyword;
}
