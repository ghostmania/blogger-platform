import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../../../core/database/database.constants';
import { UserSqlEntity, UserRow } from '../../../domain/sql/user.sql-entity';
import { UserViewDto } from '../../../api/view-dto/users.view-dto';
import { UsersQueryRepository } from '../../query/users.query-repository.abstract';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { GetUsersQueryParams } from '../../../api/input-dto/get-users-query-params.input-dto';
import {
  resolveSortExpression,
  resolveSortDirection,
} from './users-sort-columns';

const USER_COLUMNS = `
  id, login, email, password_hash,
  confirmation_code, confirmation_expiration, is_confirmed,
  recovery_code, recovery_expiration,
  first_name, last_name,
  created_at, updated_at, deleted_at
`;

//COUNT(*) OVER() отдаёт общее число строк ДО LIMIT — второй запрос не нужен
//(в монго-версии для totalCount делался отдельный countDocuments)
type UserListRow = UserRow & { total_count: string };

@Injectable()
export class UsersSqlQueryRepository extends UsersQueryRepository {
  constructor(@Inject(PG_POOL) private pool: Pool) {
    super();
  }

  async getByIdOrNotFoundFail(id: string): Promise<UserViewDto> {
    //id — bigint; нечисловая строка уронила бы запрос ошибкой 22P02
    if (!/^\d+$/.test(id)) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'User not found',
      });
    }

    const { rows } = await this.pool.query<UserRow>(
      `SELECT ${USER_COLUMNS}
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );

    if (!rows.length) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'User not found',
      });
    }

    return UserViewDto.mapToView(UserSqlEntity.fromRow(rows[0]));
  }

  async getAll(
    query: GetUsersQueryParams,
  ): Promise<PaginatedViewDto<UserViewDto[]>> {
    const sortExpression = resolveSortExpression(query.sortBy);
    const sortDirection = resolveSortDirection(query.sortDirection);

    /**
     * Условие поиска повторяет монго-логику: если не задан ни один терм —
     * фильтра нет; если задан хотя бы один — они объединяются через OR.
     * $regex + $options:'i' превращается в ILIKE '%...%'.
     */
    const { rows } = await this.pool.query<UserListRow>(
      `SELECT ${USER_COLUMNS},
              COUNT(*) OVER() AS total_count
       FROM users
       WHERE deleted_at IS NULL
         AND (
           ($1::text IS NULL AND $2::text IS NULL)
           OR ($1::text IS NOT NULL AND login ILIKE '%' || $1 || '%')
           OR ($2::text IS NOT NULL AND email ILIKE '%' || $2 || '%')
         )
       ORDER BY ${sortExpression} ${sortDirection}
       LIMIT $3 OFFSET $4`,
      [
        query.searchLoginTerm,
        query.searchEmailTerm,
        query.pageSize,
        query.calculateSkip(),
      ],
    );

    const totalCount = rows.length ? Number(rows[0].total_count) : 0;
    const items = rows.map((row) =>
      UserViewDto.mapToView(UserSqlEntity.fromRow(row)),
    );

    return PaginatedViewDto.mapToView({
      items,
      totalCount,
      page: query.pageNumber,
      size: query.pageSize,
    });
  }
}
