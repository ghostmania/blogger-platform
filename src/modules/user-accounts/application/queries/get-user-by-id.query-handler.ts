import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UsersQueryRepository } from '../../infrastructure/query/users.query-repository';
import { UserViewDto } from '../../api/view-dto/users.view-dto';

export class GetUserByIdQuery {
  constructor(public id: string) {}
}

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdQueryHandler implements IQueryHandler<
  GetUserByIdQuery,
  UserViewDto
> {
  constructor(private usersQueryRepository: UsersQueryRepository) {}

  async execute({ id }: GetUserByIdQuery): Promise<UserViewDto> {
    return this.usersQueryRepository.getByIdOrNotFoundFail(id);
  }
}
