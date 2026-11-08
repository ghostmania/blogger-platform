import { SortDirection } from '../../../../../../core/dto/base.query-params.input-dto';
import { BlogsSortBy } from '../../../api/input-dto/blogs-sort-by';

/**
 * ORDER BY нельзя параметризовать — имя колонки и направление попадают в SQL
 * текстом, поэтому оба значения проходят через белый список.
 * Первый рубеж — @IsEnum в DTO, этот второй; полагаться на один нельзя.
 */
const SORT_COLUMNS: Record<BlogsSortBy, string> = {
  [BlogsSortBy.CreatedAt]: 'created_at',
  [BlogsSortBy.Name]: 'name',
  [BlogsSortBy.Description]: 'description',
  [BlogsSortBy.WebsiteUrl]: 'website_url',
  [BlogsSortBy.IsMembership]: 'is_membership',
};

const SORT_DIRECTIONS: Record<SortDirection, 'ASC' | 'DESC'> = {
  [SortDirection.Asc]: 'ASC',
  [SortDirection.Desc]: 'DESC',
};

//COLLATE "C" даёт побайтовый порядок (как сортировка строк в JS), но применим
//только к текстовым колонкам — на timestamptz/boolean Postgres выдаст ошибку
const TEXT_COLUMNS = new Set(['name', 'description', 'website_url']);

export function resolveSortExpression(sortBy: BlogsSortBy): string {
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
