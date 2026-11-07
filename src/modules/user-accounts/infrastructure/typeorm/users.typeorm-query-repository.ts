import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { User } from '../../domain/user.entity';
import { UsersQueryRepository } from '../query/users.query-repository.abstract';
import { UserViewDto } from '../../api/view-dto/users.view-dto';
import { GetUsersQueryParams } from '../../api/input-dto/get-users-query-params.input-dto';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import {
  resolveSortExpression,
  resolveSortDirection,
} from '../sql/query/users-sort-columns';

@Injectable()
export class UsersTypeOrmQueryRepository extends UsersQueryRepository {
  constructor(
    @InjectRepository(User) private readonly repository: Repository<User>,
  ) {
    super();
  }

  async getByIdOrNotFoundFail(id: string): Promise<UserViewDto> {
    const user =
      /^\d+$/.test(id) && BigInt(id) <= 9223372036854775807n
        ? await this.repository.findOneBy({ id })
        : null;
    if (!user)
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'User not found',
      });
    return UserViewDto.mapToView(user);
  }

  async getAll(
    query: GetUsersQueryParams,
  ): Promise<PaginatedViewDto<UserViewDto[]>> {
    const builder = this.repository.createQueryBuilder('u');
    if (query.searchLoginTerm !== null || query.searchEmailTerm !== null) {
      builder.andWhere(
        new Brackets((where) => {
          if (query.searchLoginTerm !== null)
            where.orWhere('u.login ILIKE :login', {
              login: `%${query.searchLoginTerm}%`,
            });
          if (query.searchEmailTerm !== null)
            where.orWhere('u.email ILIKE :email', {
              email: `%${query.searchEmailTerm}%`,
            });
        }),
      );
    }
    const direction = resolveSortDirection(query.sortDirection) as
      'ASC' | 'DESC';
    const [users, totalCount] = await builder
      .orderBy(resolveSortExpression(query.sortBy), direction)
      .addOrderBy('u.id', direction)
      .offset(query.calculateSkip())
      .limit(query.pageSize)
      .getManyAndCount();
    return PaginatedViewDto.mapToView({
      items: users.map(UserViewDto.mapToView),
      totalCount,
      page: query.pageNumber,
      size: query.pageSize,
    });
  }
}
