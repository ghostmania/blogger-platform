import { UserViewDto } from '../../api/view-dto/users.view-dto';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { GetUsersQueryParams } from '../../api/input-dto/get-users-query-params.input-dto';

//контракт read-модели юзеров; реализации — Mongo и SQL
export abstract class UsersQueryRepository {
  abstract getByIdOrNotFoundFail(id: string): Promise<UserViewDto>;

  abstract getAll(
    query: GetUsersQueryParams,
  ): Promise<PaginatedViewDto<UserViewDto[]>>;
}
