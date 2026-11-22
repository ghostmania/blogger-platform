import { SortDirection } from '../../../../../../core/dto/base.query-params.input-dto';
import { QuestionsSortBy } from '../../../api/input-dto/questions-sort-by';

/**
 * ORDER BY нельзя параметризовать — имя колонки и направление попадают в SQL
 * текстом, поэтому оба значения проходят через белый список.
 * Первый рубеж — @IsEnum в DTO, этот второй; полагаться на один нельзя.
 */
const SORT_COLUMNS: Record<QuestionsSortBy, string> = {
  [QuestionsSortBy.CreatedAt]: 'created_at',
  [QuestionsSortBy.UpdatedAt]: 'updated_at',
  [QuestionsSortBy.Body]: 'body',
  [QuestionsSortBy.Published]: 'published',
};

const SORT_DIRECTIONS: Record<SortDirection, 'ASC' | 'DESC'> = {
  [SortDirection.Asc]: 'ASC',
  [SortDirection.Desc]: 'DESC',
};

//COLLATE "C" применим только к текстовым колонкам — на timestamptz/boolean Postgres выдаст ошибку
const TEXT_COLUMNS = new Set(['body']);

export function resolveSortExpression(sortBy: QuestionsSortBy): string {
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
