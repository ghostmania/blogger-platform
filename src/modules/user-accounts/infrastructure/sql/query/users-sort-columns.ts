import { UsersSortBy } from '../../../api/input-dto/users-sort-by';
import { SortDirection } from '../../../../../core/dto/base.query-params.input-dto';

/**
 * ORDER BY нельзя параметризовать через $1 — имя колонки и направление
 * попадают в SQL текстом. Поэтому оба значения проходят через белый список.
 * Первый рубеж — @IsEnum в DTO, этот второй; полагаться на один нельзя.
 *
 * В монго-версии этой проблемы нет вовсе: там sort принимает объект,
 * и значение не может «вытечь» в текст запроса.
 */
const SORT_COLUMNS: Record<UsersSortBy, string> = {
  [UsersSortBy.CreatedAt]: 'created_at',
  [UsersSortBy.Login]: 'login',
  [UsersSortBy.Email]: 'email',
};

const SORT_DIRECTIONS: Record<SortDirection, string> = {
  [SortDirection.Asc]: 'ASC',
  [SortDirection.Desc]: 'DESC',
};

//COLLATE "C" даёт побайтовый порядок (как в монго), но применим только
//к текстовым колонкам — на timestamptz Postgres выдаст ошибку
const TEXT_COLUMNS = new Set(['login', 'email']);

export function resolveSortColumn(sortBy: UsersSortBy): string {
  const column = SORT_COLUMNS[sortBy];

  if (!column) {
    throw new Error(`Unsupported sort column: ${sortBy}`);
  }

  return column;
}

export function resolveSortExpression(sortBy: UsersSortBy): string {
  const column = resolveSortColumn(sortBy);

  return TEXT_COLUMNS.has(column) ? `${column} COLLATE "C"` : column;
}

export function resolveSortDirection(direction: SortDirection): string {
  const keyword = SORT_DIRECTIONS[direction];

  if (!keyword) {
    throw new Error(`Unsupported sort direction: ${direction}`);
  }

  return keyword;
}
